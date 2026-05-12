"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().trim().nullable(),
);

const SupplierSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  contactName: optionalString,
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().email("Enter a valid email.").nullable(),
  ),
  phone: optionalString,
});

export type SupplierFormState =
  | { ok: true; message: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<"name" | "contactName" | "email" | "phone", string[]>>;
    }
  | undefined;

export async function createSupplier(
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  await requirePermission("menu.products");

  const parsed = SupplierSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.supplier.create({ data: parsed.data });

  revalidatePath("/admin/products");
  return { ok: true, message: `Created supplier “${parsed.data.name}”` };
}

export async function updateSupplier(
  _prev: SupplierFormState,
  formData: FormData,
): Promise<SupplierFormState> {
  await requirePermission("menu.products");

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing supplier id." };

  const parsed = SupplierSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.supplier.update({ where: { id }, data: parsed.data });

  revalidatePath("/admin/products");
  return { ok: true, message: `Updated supplier “${parsed.data.name}”` };
}

export async function deleteSupplier(formData: FormData) {
  await requirePermission("menu.products");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const inUse = await prisma.product.count({ where: { supplierId: id } });
  if (inUse > 0) {
    throw new Error(`Cannot delete: ${inUse} product${inUse === 1 ? "" : "s"} use this supplier.`);
  }

  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/admin/products");
}
