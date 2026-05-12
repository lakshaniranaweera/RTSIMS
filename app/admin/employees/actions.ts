"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requirePermission } from "@/lib/permissions";

const CreateUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["ADMIN", "STORES", "STAFF"]),
});

export type CreateUserState =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof z.infer<typeof CreateUserSchema>, string[]>> }
  | undefined;

export async function createUser(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  await requirePermission("menu.employees");

  const parsed = CreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, email, password, role } = parsed.data;

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: role as Role,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "A user with that email already exists.", fieldErrors: { email: ["Email is taken."] } };
    }
    throw e;
  }

  revalidatePath("/admin/employees");
  return { ok: true, message: `Created ${email}` };
}

export async function softDeleteUser(formData: FormData) {
  const { userId: actorId } = await requirePermission("menu.employees");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");
  if (id === actorId) throw new Error("You cannot delete your own account.");

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/admin/employees");
}

export async function restoreUser(formData: FormData) {
  await requirePermission("menu.employees");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  await prisma.user.update({
    where: { id },
    data: { deletedAt: null },
  });

  revalidatePath("/admin/employees");
}
