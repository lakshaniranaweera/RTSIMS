import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { syncExpiryNotifications, EXPIRY_WINDOW_DAYS, EXPIRY_TYPE } from "@/lib/notifications";
import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkReadButton } from "@/components/notification-actions";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const DAY = 24 * 60 * 60 * 1000;

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "menu.dashboard.admin"))) redirect("/login");

  // Fan-out idempotent expiry alerts for the admin team
  await syncExpiryNotifications();

  // Live data for the dashboard cards
  const now = new Date();
  const cutoff = new Date(Date.now() + EXPIRY_WINDOW_DAYS * DAY);

  const [expiringProducts, allActiveProducts, expiryNotifs, totals] = await Promise.all([
    prisma.product.findMany({
      where: { archived: false, expiryDate: { gte: now, lte: cutoff } },
      orderBy: { expiryDate: "asc" },
      include: { category: { select: { name: true } } },
      take: 20,
    }),
    prisma.product.findMany({
      where: { archived: false },
      orderBy: { qty: "asc" },
      select: { id: true, name: true, qty: true, minStock: true },
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id, type: EXPIRY_TYPE, read: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { archived: false } }),
      prisma.category.count(),
      prisma.supplier.count(),
    ]).then(([users, products, categories, suppliers]) => ({
      users,
      products,
      categories,
      suppliers,
    })),
  ]);

  const lowStockProducts = allActiveProducts
    .filter((p) => p.qty < p.minStock)
    .slice(0, 10);

  return (
    <AppShell title="Admin · Dashboard">
      <div className="space-y-6 max-w-6xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Users" value={totals.users} />
          <Stat label="Products" value={totals.products} />
          <Stat label="Categories" value={totals.categories} />
          <Stat label="Suppliers" value={totals.suppliers} />
        </div>

        <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-500/5">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Expiry alerts</CardTitle>
              <CardDescription>
                Products expiring within {EXPIRY_WINDOW_DAYS} days. New entries are
                added to your notification inbox automatically.
              </CardDescription>
            </div>
            <Button render={<Link href="/notifications" />} nativeButton={false} variant="outline" size="sm">
              All notifications
            </Button>
          </CardHeader>
          <CardContent>
            {expiringProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing expiring in the next {EXPIRY_WINDOW_DAYS} days. ✓
              </p>
            ) : (
              <ul className="divide-y">
                {expiringProducts.map((p) => {
                  const days = Math.max(
                    0,
                    Math.floor((p.expiryDate!.getTime() - Date.now()) / DAY),
                  );
                  const notif = expiryNotifs.find((n) => n.link === `/admin/products/${p.id}`);
                  const tone = days <= 30 ? "bg-red-500" : days <= 60 ? "bg-amber-500" : "bg-amber-400";
                  return (
                    <li key={p.id} className="flex items-center gap-3 py-2">
                      <Badge className={`${tone} text-white tabular-nums`}>{days}d</Badge>
                      <div className="flex-1">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.category.name} · expires {dateFmt.format(p.expiryDate!)}
                        </span>
                      </div>
                      {notif ? (
                        <MarkReadButton id={notif.id} />
                      ) : (
                        <Badge variant="outline">read</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low stock</CardTitle>
            <CardDescription>
              Products at or below their minimum stock threshold.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products are above their min-stock threshold. ✓</p>
            ) : (
              <ul className="divide-y">
                {lowStockProducts.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2">
                    <Badge className="bg-amber-500 text-white tabular-nums">
                      {p.qty}/{p.minStock}
                    </Badge>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
