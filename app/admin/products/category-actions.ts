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

const CategorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
});

export type CategoryFormState =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: { name?: string[] } }
  | undefined;

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requirePermission("menu.products");

  const parsed = CategorySchema.safeParse({ name: formData.get("name") });
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
    await prisma.category.create({ data: { name, slug } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "A category with that name already exists.", fieldErrors: { name: ["Name is taken."] } };
    }
    throw e;
  }

  revalidatePath("/admin/products");
  return { ok: true, message: `Created category “${name}”` };
}

export async function updateCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requirePermission("menu.products");

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing category id." };

  const parsed = CategorySchema.safeParse({ name: formData.get("name") });
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
    await prisma.category.update({ where: { id }, data: { name, slug } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        error: "A category with that name already exists.",
        fieldErrors: { name: ["Name is taken."] },
      };
    }
    throw e;
  }

  revalidatePath("/admin/products");
  return { ok: true, message: `Updated category “${name}”` };
}

export async function deleteCategory(formData: FormData) {
  await requirePermission("menu.products");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const inUse = await prisma.product.count({ where: { categoryId: id } });
  if (inUse > 0) {
    throw new Error(`Cannot delete: ${inUse} product${inUse === 1 ? "" : "s"} use this category.`);
  }

  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/products");
}
