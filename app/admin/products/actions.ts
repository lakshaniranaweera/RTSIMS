"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

const optionalDate = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.date().nullable(),
);

const optionalString = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const t = v.trim();
    if (t === "" || t === "__none__") return null;
    return t;
  },
  z.string().nullable(),
);

function dayUTC(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const ProductSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters."),
    description: optionalString,
    categoryId: z.string().min(1, "Pick a category."),
    qty: z.coerce.number().int().nonnegative(),
    minStock: z.coerce.number().int().nonnegative(),
    productDate: optionalDate,
    expiryDate: optionalDate,
    deliveryDate: optionalDate,
    supplierId: optionalString,
    location: z.enum(["OFFICE", "STORE"]),
    archived: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
    fixedAsset: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  })
  .superRefine((data, ctx) => {
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const prod = data.productDate ? dayUTC(data.productDate) : null;
    const exp = data.expiryDate ? dayUTC(data.expiryDate) : null;
    const del = data.deliveryDate ? dayUTC(data.deliveryDate) : null;

    if (prod !== null && prod > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productDate"],
        message: "Product date cannot be in the future.",
      });
    }
    if (prod !== null && exp !== null && exp < prod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiryDate"],
        message: "Expiry date must be on or after the product date.",
      });
    }
    if (prod !== null && del !== null && del < prod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryDate"],
        message: "Delivery date must be on or after the product date.",
      });
    }
    if (exp !== null && del !== null && del > exp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryDate"],
        message: "Delivery date must be on or before the expiry date.",
      });
    }
  });

type ProductInput = z.infer<typeof ProductSchema>;

export type ProductFormState =
  | { ok: true; message: string; id?: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof ProductInput, string[]>> }
  | undefined;

function parse(formData: FormData) {
  return ProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    qty: formData.get("qty"),
    minStock: formData.get("minStock"),
    productDate: formData.get("productDate"),
    expiryDate: formData.get("expiryDate"),
    deliveryDate: formData.get("deliveryDate"),
    supplierId: formData.get("supplierId"),
    location: formData.get("location"),
    archived: formData.get("archived"),
    fixedAsset: formData.get("fixedAsset"),
  });
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requirePermission("menu.products");

  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let created;
  try {
    created = await prisma.product.create({
      data: parsed.data as Prisma.ProductUncheckedCreateInput,
      select: { id: true },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create product." };
  }

  revalidatePath("/admin/products");
  return { ok: true, message: `Created “${parsed.data.name}”`, id: created.id };
}

const FIELDS_TRACKED = [
  "name",
  "description",
  "categoryId",
  "qty",
  "minStock",
  "productDate",
  "expiryDate",
  "deliveryDate",
  "supplierId",
  "location",
  "archived",
  "fixedAsset",
] as const satisfies readonly (keyof ProductInput)[];

function fmt(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const { userId } = await requirePermission("menu.products");

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing product id." };

  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Product not found." };

  const data = parsed.data;

  // Build a list of changed fields → ProductLog rows
  const logs: Prisma.ProductLogCreateManyInput[] = [];
  for (const field of FIELDS_TRACKED) {
    const before = fmt((existing as Record<string, unknown>)[field]);
    const after = fmt(data[field]);
    if (before !== after) {
      logs.push({
        productId: id,
        field,
        oldValue: before || null,
        newValue: after || null,
        actorId: userId,
      });
    }
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id },
      data: data as Prisma.ProductUncheckedUpdateInput,
    }),
    ...(logs.length ? [prisma.productLog.createMany({ data: logs })] : []),
  ]);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  return { ok: true, message: `Saved (${logs.length} field${logs.length === 1 ? "" : "s"} changed)`, id };
}

export async function archiveProduct(formData: FormData) {
  const { userId } = await requirePermission("menu.products");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing product id.");

  const product = await prisma.product.findUnique({
    where: { id },
    select: { archived: true },
  });
  if (!product) throw new Error("Product not found.");
  if (product.archived) {
    revalidatePath("/admin/products");
    return;
  }

  await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { archived: true } }),
    prisma.productLog.create({
      data: {
        productId: id,
        field: "archived",
        oldValue: "false",
        newValue: "true",
        actorId: userId,
      },
    }),
  ]);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

export async function unarchiveProduct(formData: FormData) {
  const { userId } = await requirePermission("menu.products");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing product id.");

  await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { archived: false } }),
    prisma.productLog.create({
      data: {
        productId: id,
        field: "archived",
        oldValue: "true",
        newValue: "false",
        actorId: userId,
      },
    }),
  ]);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

const StockAdjustSchema = z.object({
  id: z.string().min(1),
  delta: z.coerce.number().int(),
});

export async function adjustStock(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requirePermission("menu.products");

  const parsed = StockAdjustSchema.safeParse({
    id: formData.get("id"),
    delta: formData.get("delta"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const { id, delta } = parsed.data;
  if (delta === 0) return { ok: true };

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id }, select: { qty: true } });
    if (!existing) return null;
    const next = existing.qty + delta;
    if (next < 0) return "negative";
    await tx.product.update({ where: { id }, data: { qty: next } });
    await tx.productLog.create({
      data: {
        productId: id,
        field: "qty",
        oldValue: String(existing.qty),
        newValue: String(next),
        actorId: userId,
      },
    });
    return "ok";
  });

  if (result === null) return { ok: false, error: "Product not found." };
  if (result === "negative") return { ok: false, error: "Stock cannot go negative." };

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  return { ok: true };
}
