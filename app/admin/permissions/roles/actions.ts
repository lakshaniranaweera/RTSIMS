"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

const ROLES = new Set<string>(Object.values(Role));

export async function toggleRolePermission(formData: FormData) {
  await requirePermission("permissions.manage");

  const role = String(formData.get("role") ?? "");
  const permissionId = String(formData.get("permissionId") ?? "");
  const grant = formData.get("grant") === "1";

  if (!ROLES.has(role) || !permissionId) {
    throw new Error("Invalid role or permissionId");
  }

  if (grant) {
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role: role as Role, permissionId } },
      update: {},
      create: { role: role as Role, permissionId },
    });
  } else {
    await prisma.rolePermission.deleteMany({
      where: { role: role as Role, permissionId },
    });
  }

  revalidatePath("/admin/permissions/roles");
  // Sidebar visibility for everyone with that role may change
  revalidatePath("/", "layout");
}
