"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

const BrandSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
});

export type BrandFormState =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: { name?: string[] } }
  | undefined;

export async function createBrand(
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  await requirePermission("menu.products");

  const parsed = BrandSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name } = parsed.data;
  const slug = slugify(name);
  if (!slug) return { ok: false, error: "Name must contain at least one letter or digit." };

  try {
    await prisma.brand.create({ data: { name, slug } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "A brand with that name already exists.", fieldErrors: { name: ["Name is taken."] } };
    }
    throw e;
  }

  revalidatePath("/admin/products");
  return { ok: true, message: `Created brand "${name}"` };
}

export async function updateBrand(
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  await requirePermission("menu.products");

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing brand id." };

  const parsed = BrandSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name } = parsed.data;
  const slug = slugify(name);
  if (!slug) return { ok: false, error: "Name must contain at least one letter or digit." };

  try {
    await prisma.brand.update({ where: { id }, data: { name, slug } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        error: "A brand with that name already exists.",
        fieldErrors: { name: ["Name is taken."] },
      };
    }
    throw e;
  }

  revalidatePath("/admin/products");
  return { ok: true, message: `Updated brand "${name}"` };
}

export async function deleteBrand(formData: FormData) {
  await requirePermission("menu.products");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  await prisma.brand.delete({ where: { id } });
  revalidatePath("/admin/products");
}
