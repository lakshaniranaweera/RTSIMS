import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, Truck, Package, AlertTriangle, Clock } from "lucide-react";
import { FilterBar } from "./filter-bar";
import { ProductRowActions } from "./row-actions";
import { AddCategoryDialog } from "./add-category-dialog";
import { AddSupplierDialog } from "./add-supplier-dialog";
import { AddProductDialog } from "./add-product-dialog";
import { TaxonomyDeleteButton } from "./taxonomy-row-actions";
import { EditCategoryDialog } from "./edit-category-dialog";
import { EditSupplierDialog } from "./edit-supplier-dialog";
import { ProductTabs, type ProductTab } from "./tabs";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const DAY = 24 * 60 * 60 * 1000;

function expiryTone(expiry: Date | null): {
  tone: "ok" | "soon" | "expired" | "none";
  daysLeft: number | null;
} {
  if (!expiry) return { tone: "none", daysLeft: null };
  const days = Math.floor((expiry.getTime() - Date.now()) / DAY);
  if (days < 0) return { tone: "expired", daysLeft: days };
  if (days <= 90) return { tone: "soon", daysLeft: days };
  return { tone: "ok", daysLeft: days };
}

const LOCATION_TONE = {
  OFFICE: "bg-violet-500 text-white",
  STORE: "bg-sky-500 text-white",
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof Package;
  tone: "blue" | "green" | "amber" | "red" | "purple" | "sky" | "orange";
}) {
  const toneClasses = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    red: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
  };

  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3 pt-0">
        <div className={`flex size-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; showArchived?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "menu.products"))) {
    redirect("/admin");
  }

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const categoryId = sp.categoryId ?? null;
  const showArchived = sp.showArchived === "true";
  const tab: ProductTab =
    sp.tab === "categories" || sp.tab === "suppliers" ? sp.tab : "products";

  const where = {
    ...(q && { name: { contains: q, mode: "insensitive" as const } }),
    ...(categoryId && { categoryId }),
    ...(!showArchived && { archived: false }),
  };

  const [products, categoriesAll, suppliersAll, productCountByCategory, productCountBySupplier, totalProducts] =
    await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ archived: "asc" }, { name: "asc" }],
        include: {
          category: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
        },
      }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.supplier.findMany({ orderBy: { name: "asc" } }),
      prisma.product.groupBy({ by: ["categoryId"], _count: { _all: true } }),
      prisma.product.groupBy({ by: ["supplierId"], _count: { _all: true } }),
      prisma.product.count({ where: { archived: false } }),
    ]);

  const productsPerCategory = new Map(
    productCountByCategory.map((g) => [g.categoryId, g._count._all]),
  );
  const productsPerSupplier = new Map(
    productCountBySupplier.map((g) => [g.supplierId, g._count._all]),
  );

  const lowStockCount = products.filter((p) => !p.archived && p.qty < p.minStock).length;
  const expiringCount = products.filter(
    (p) => !p.archived && expiryTone(p.expiryDate).tone === "soon",
  ).length;
  const expiredCount = products.filter(
    (p) => !p.archived && expiryTone(p.expiryDate).tone === "expired",
  ).length;

  const categoriesWithProducts = categoriesAll.filter(
    (c) => (productsPerCategory.get(c.id) ?? 0) > 0,
  ).length;
  const emptyCategories = categoriesAll.length - categoriesWithProducts;

  const suppliersWithProducts = suppliersAll.filter(
    (s) => (productsPerSupplier.get(s.id) ?? 0) > 0,
  ).length;

  return (
    <AppShell title="Products">
      <div className="space-y-4 max-w-6xl">
        {/* Tab switcher */}
        <ProductTabs active={tab} />

        {/* ═══════════════════ PRODUCTS TAB ═══════════════════ */}
        {tab === "products" && (
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Items</h2>
                <p className="text-sm text-muted-foreground">
                  Manage inventory items, track stock levels, and monitor expiry.
                </p>
              </div>
              <AddProductDialog categories={categoriesAll} suppliers={suppliersAll} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Products" value={totalProducts} icon={Package} tone="blue" />
              <StatCard label="Low Stock" value={lowStockCount} icon={AlertTriangle} tone="amber" />
              <StatCard label="Expiring ≤ 90d" value={expiringCount} icon={Clock} tone="orange" />
              <StatCard label="Expired" value={expiredCount} icon={AlertTriangle} tone="red" />
            </div>

            <Card>
              <CardContent className="space-y-4">
                <FilterBar categories={categoriesAll} />
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Min</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                            No products match the filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        products.map((p) => {
                          const low = !p.archived && p.qty < p.minStock;
                          const exp = expiryTone(p.expiryDate);
                          const rowTone = p.archived
                            ? "opacity-60"
                            : low
                            ? "bg-amber-50/60 dark:bg-amber-500/10"
                            : exp.tone === "expired"
                            ? "bg-red-50/60 dark:bg-red-500/10"
                            : "";
                          return (
                            <TableRow key={p.id} className={rowTone}>
                              <TableCell className="font-medium">
                                <Link href={`/admin/products/${p.id}`} className="hover:underline">
                                  {p.name}
                                </Link>
                                {p.archived && (
                                  <Badge variant="outline" className="ml-2">
                                    archived
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {p.category.name}
                              </TableCell>
                              <TableCell>
                                <Badge className={LOCATION_TONE[p.location]}>{p.location}</Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {low ? (
                                  <span className="text-amber-700 font-medium">{p.qty}</span>
                                ) : (
                                  p.qty
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground">
                                {p.minStock}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {p.supplier?.name ?? "—"}
                              </TableCell>
                              <TableCell>
                                {p.expiryDate ? (
                                  <span className="text-sm">
                                    {dateFmt.format(p.expiryDate)}
                                    {exp.tone === "expired" && (
                                      <Badge className="ml-2 bg-red-500 text-white">expired</Badge>
                                    )}
                                    {exp.tone === "soon" && (
                                      <Badge className="ml-2 bg-amber-500 text-white">
                                        {exp.daysLeft}d
                                      </Badge>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <ProductRowActions productId={p.id} archived={p.archived} />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ═══════════════════ CATEGORIES TAB ═══════════════════ */}
        {tab === "categories" && (
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Categories</h2>
                <p className="text-sm text-muted-foreground">
                  Organize products into categories for easier browsing and reporting.
                </p>
              </div>
              <AddCategoryDialog />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Total Categories" value={categoriesAll.length} icon={FolderOpen} tone="blue" />
              <StatCard label="In Use" value={categoriesWithProducts} icon={Package} tone="green" />
              <StatCard label="Empty" value={emptyCategories} icon={AlertTriangle} tone="amber" />
            </div>

            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead className="text-right">Products</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoriesAll.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                          No categories yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      categoriesAll.map((c) => {
                        const inUse = productsPerCategory.get(c.id) ?? 0;
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              <code className="text-xs">{c.slug}</code>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{inUse}</TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <EditCategoryDialog category={{ id: c.id, name: c.name }} />
                                <TaxonomyDeleteButton id={c.id} kind="category" inUse={inUse} />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        )}

        {/* ═══════════════════ SUPPLIERS TAB ═══════════════════ */}
        {tab === "suppliers" && (
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Suppliers</h2>
                <p className="text-sm text-muted-foreground">
                  Track supplier contact details and the products they provide.
                </p>
              </div>
              <AddSupplierDialog />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Total Suppliers" value={suppliersAll.length} icon={Truck} tone="purple" />
              <StatCard label="In Use" value={suppliersWithProducts} icon={Package} tone="green" />
              <StatCard label="Unused" value={suppliersAll.length - suppliersWithProducts} icon={FolderOpen} tone="sky" />
            </div>

            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Products</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliersAll.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                          No suppliers yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      suppliersAll.map((s) => {
                        const inUse = productsPerSupplier.get(s.id) ?? 0;
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {s.contactName ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {s.email ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {s.phone ?? "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{inUse}</TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <EditSupplierDialog
                                  supplier={{
                                    id: s.id,
                                    name: s.name,
                                    contactName: s.contactName,
                                    email: s.email,
                                    phone: s.phone,
                                  }}
                                />
                                <TaxonomyDeleteButton id={s.id} kind="supplier" inUse={inUse} />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </AppShell>
  );
}
