import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { SIDEBAR_ITEMS } from "@/lib/sidebar-config";

export const getEffectivePermissions = cache(
  async (userId: string): Promise<Set<string>> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true, deletedAt: true },
    });
    if (!user || user.deletedAt) return new Set();

    const [rolePerms, userPerms] = await Promise.all([
      user.roleId
        ? prisma.rolePermission.findMany({
            where: { roleId: user.roleId },
            select: { permission: { select: { key: true } } },
          })
        : Promise.resolve([]),
      prisma.userPermission.findMany({
        where: { userId },
        select: { effect: true, permission: { select: { key: true } } },
      }),
    ]);

    const set = new Set<string>(rolePerms.map((r) => r.permission.key));
    for (const u of userPerms) {
      if (u.effect === "ALLOW") set.add(u.permission.key);
      else set.delete(u.permission.key);
    }
    return set;
  },
);

/**
 * Resolve where a user should land after login: the configured `landingPath`
 * on their role, else the first sidebar item they have permission for, else
 * the notifications centre.
 */
export async function resolveLandingPath(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { landingPath: true } } },
  });
  if (user?.role?.landingPath) return user.role.landingPath;

  const perms = await getEffectivePermissions(userId);
  const item = SIDEBAR_ITEMS.find((i) =>
    i.requiresAny ? i.requiresAny.some((k) => perms.has(k)) : perms.has(i.key),
  );
  return item?.href ?? "/notifications";
}

export async function hasPermission(userId: string, key: string): Promise<boolean> {
  const perms = await getEffectivePermissions(userId);
  return perms.has(key);
}

/** Throws (catchable as a Forbidden) if the current session lacks `key`. */
export async function requirePermission(key: string): Promise<{ userId: string; permissions: Set<string> }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const perms = await getEffectivePermissions(session.user.id);
  if (!perms.has(key)) throw new Error(`Forbidden: ${key}`);
  return { userId: session.user.id, permissions: perms };
}
