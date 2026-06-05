"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

const RoleSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  description: z.string().trim().max(200).optional(),
  landingPath: z.string().trim().optional(),
});

export type RoleFormState =
  | { ok: true; message: string; id?: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<keyof z.infer<typeof RoleSchema>, string[]>>;
    }
  | undefined;

function parse(formData: FormData) {
  return RoleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    landingPath: formData.get("landingPath") || undefined,
  });
}

export async function createRole(
  _prev: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  await requirePermission("permissions.manage");

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
    created = await prisma.role.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        landingPath: parsed.data.landingPath || null,
      },
      select: { id: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        error: "A role with that name already exists.",
        fieldErrors: { name: ["Name is taken."] },
      };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create role." };
  }

  revalidatePath("/admin/permissions/roles");
  return { ok: true, message: `Created role "${parsed.data.name}"`, id: created.id };
}

export async function updateRole(
  _prev: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  await requirePermission("permissions.manage");

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing role id." };

  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.role.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        landingPath: parsed.data.landingPath || null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        error: "A role with that name already exists.",
        fieldErrors: { name: ["Name is taken."] },
      };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update role." };
  }

  revalidatePath("/admin/permissions/roles");
  revalidatePath("/", "layout");
  return { ok: true, message: `Saved "${parsed.data.name}"`, id };
}

export async function deleteRole(formData: FormData) {
  await requirePermission("permissions.manage");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing role id.");

  const role = await prisma.role.findUnique({
    where: { id },
    select: { isSystem: true, _count: { select: { users: true } } },
  });
  if (!role) throw new Error("Role not found.");
  if (role.isSystem) throw new Error("System roles cannot be deleted.");
  if (role._count.users > 0) {
    throw new Error("Reassign users off this role before deleting it.");
  }

  await prisma.role.delete({ where: { id } });

  revalidatePath("/admin/permissions/roles");
  revalidatePath("/", "layout");
}

export async function toggleRolePermission(formData: FormData) {
  await requirePermission("permissions.manage");

  const roleId = String(formData.get("roleId") ?? "");
  const permissionId = String(formData.get("permissionId") ?? "");
  const grant = formData.get("grant") === "1";

  if (!roleId || !permissionId) {
    throw new Error("Invalid roleId or permissionId");
  }

  if (grant) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  } else {
    // Anti-lockout: never strip permissions.manage from a system role.
    const [role, perm] = await Promise.all([
      prisma.role.findUnique({ where: { id: roleId }, select: { isSystem: true } }),
      prisma.permission.findUnique({ where: { id: permissionId }, select: { key: true } }),
    ]);
    if (role?.isSystem && perm?.key === "permissions.manage") {
      throw new Error("Cannot remove permission management from a system role.");
    }
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
  }

  revalidatePath(`/admin/permissions/roles/${roleId}`);
  revalidatePath("/admin/permissions/roles");
  // Sidebar visibility for everyone with that role may change
  revalidatePath("/", "layout");
}
