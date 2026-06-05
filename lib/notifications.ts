import "server-only";
import { prisma } from "@/lib/prisma";

const DAY = 24 * 60 * 60 * 1000;
export const EXPIRY_WINDOW_DAYS = 90;
export const EXPIRY_TYPE = "EXPIRY_WARNING";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

/**
 * Idempotently inserts EXPIRY_WARNING notifications for every ADMIN user
 * whose dashboard hasn't yet been notified about a soon-to-expire product.
 *
 * Dedupe key: (userId, link). One notification per (admin, product).
 */
export async function syncExpiryNotifications(): Promise<number> {
  const now = new Date();
  const cutoff = new Date(Date.now() + EXPIRY_WINDOW_DAYS * DAY);

  const [expiring, admins] = await Promise.all([
    prisma.product.findMany({
      where: {
        archived: false,
        expiryDate: { gte: now, lte: cutoff },
      },
      select: { id: true, name: true, expiryDate: true },
    }),
    // "Admins" = users whose role grants the admin dashboard permission.
    prisma.user.findMany({
      where: {
        deletedAt: null,
        role: {
          rolePermissions: { some: { permission: { key: "menu.dashboard.admin" } } },
        },
      },
      select: { id: true },
    }),
  ]);

  if (expiring.length === 0 || admins.length === 0) return 0;

  const links = expiring.map((p) => `/admin/products/${p.id}`);
  const existing = await prisma.notification.findMany({
    where: {
      type: EXPIRY_TYPE,
      userId: { in: admins.map((a) => a.id) },
      link: { in: links },
    },
    select: { userId: true, link: true },
  });

  const have = new Set(existing.map((n) => `${n.userId}|${n.link}`));

  const toCreate: Array<{
    userId: string;
    type: string;
    message: string;
    link: string;
  }> = [];
  for (const admin of admins) {
    for (const p of expiring) {
      const link = `/admin/products/${p.id}`;
      if (have.has(`${admin.id}|${link}`)) continue;
      const days = Math.max(
        0,
        Math.floor((p.expiryDate!.getTime() - Date.now()) / DAY),
      );
      toCreate.push({
        userId: admin.id,
        type: EXPIRY_TYPE,
        message: `${p.name} expires on ${dateFmt.format(p.expiryDate!)} (${days} day${days === 1 ? "" : "s"})`,
        link,
      });
    }
  }

  if (toCreate.length === 0) return 0;
  await prisma.notification.createMany({ data: toCreate });
  return toCreate.length;
}

export async function getNotifications(userId: string, opts?: { unreadOnly?: boolean }) {
  return prisma.notification.findMany({
    where: { userId, ...(opts?.unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}
