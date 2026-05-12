import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Plus } from "lucide-react";
import { FilterBar } from "./filter-bar";
import { ProductRowActions } from "./row-actions";
import { AddCategoryDialog } from "./add-category-dialog";
import { AddSupplierDialog } from "./add-supplier-dialog";
import { TaxonomyDeleteButton } from "./taxonomy-row-actions";

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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; showArchived?: string }>;
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

  const where = {
    ...(q && { name: { contains: q, mode: "insensitive" as const } }),
    ...(categoryId && { categoryId }),
    ...(!showArchived && { archived: false }),
  };

  const [products, categoriesAll, suppliersAll, productCountByCategory, productCountBySupplier] =
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

  return (
    <AppShell title="Products">
      <div className="space-y-6 max-w-6xl">
        {/* Top button bar */}
        <div className="flex flex-wrap items-center gap-2">
          <AddCategoryDialog />
          <AddSupplierDialog />
          <Button render={<Link href="/admin/products/new" />} nativeButton={false} size="sm">
            <Plus />
            Add Product
          </Button>
        </div>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categories</CardTitle>
            <CardDescription>{categoriesAll.length} total</CardDescription>
          </CardHeader>
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
                          <TaxonomyDeleteButton id={c.id} kind="category" inUse={inUse} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suppliers</CardTitle>
            <CardDescription>{suppliersAll.length} total</CardDescription>
          </CardHeader>
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
                          <TaxonomyDeleteButton id={s.id} kind="supplier" inUse={inUse} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catalogue</CardTitle>
            <CardDescription>
              {products.length} match{products.length === 1 ? "" : "es"} ·{" "}
              <span className="text-amber-700">{lowStockCount} low stock</span> ·{" "}
              <span className="text-red-700">{expiringCount} expiring ≤ 90d</span>
            </CardDescription>
          </CardHeader>
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
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="hover:underline"
                            >
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
                                  <Badge className="ml-2 bg-red-500 text-white">
                                    expired
                                  </Badge>
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
      </div>
    </AppShell>
  );
}
