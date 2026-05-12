"use server";

import { revalidatePath } from "next/cache";
import { PermissionEffect } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

const EFFECTS = new Set<string>(["ALLOW", "DENY", "INHERIT"]);

export async function setUserPermission(formData: FormData) {
  const { userId: actorId } = await requirePermission("permissions.manage");

  const userId = String(formData.get("userId") ?? "");
  const permissionId = String(formData.get("permissionId") ?? "");
  const effect = String(formData.get("effect") ?? "");

  if (!userId || !permissionId || !EFFECTS.has(effect)) {
    throw new Error("Invalid input");
  }

  if (effect === "INHERIT") {
    await prisma.userPermission.deleteMany({ where: { userId, permissionId } });
  } else {
    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId } },
      update: { effect: effect as PermissionEffect, grantedById: actorId },
      create: {
        userId,
        permissionId,
        effect: effect as PermissionEffect,
        grantedById: actorId,
      },
    });
  }

  revalidatePath(`/admin/permissions/users/${userId}`);
  revalidatePath("/", "layout");
}
