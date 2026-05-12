import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductForm } from "../product-form";
import { StockAdjust } from "../stock-adjust";

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "menu.products"))) {
    redirect("/admin");
  }

  const [product, categories, suppliers, logs] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { category: { select: { name: true } }, supplier: { select: { name: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.productLog.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  if (!product) notFound();

  const lowStock = product.qty < product.minStock;

  return (
    <AppShell title={`Product · ${product.name}`}>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{product.name}</h2>
            <p className="text-sm text-muted-foreground">
              {product.category.name}
              {product.supplier ? ` · ${product.supplier.name}` : ""}
              {product.archived && (
                <Badge variant="outline" className="ml-2">archived</Badge>
              )}
              {lowStock && !product.archived && (
                <Badge className="ml-2 bg-amber-500 text-white">low stock</Badge>
              )}
            </p>
          </div>
          <Button render={<Link href="/admin/products" />} nativeButton={false} variant="outline" size="sm">
            ← All products
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock</CardTitle>
            <CardDescription>
              Current quantity: <span className="font-medium tabular-nums">{product.qty}</span>{" "}
              · minimum: {product.minStock}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StockAdjust productId={product.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit details</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm
              mode="edit"
              defaults={{
                id: product.id,
                name: product.name,
                description: product.description,
                categoryId: product.categoryId,
                qty: product.qty,
                minStock: product.minStock,
                productDate: product.productDate,
                expiryDate: product.expiryDate,
                deliveryDate: product.deliveryDate,
                supplierId: product.supplierId,
                location: product.location,
                archived: product.archived,
                fixedAsset: product.fixedAsset,
              }}
              categories={categories}
              suppliers={suppliers}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity log</CardTitle>
            <CardDescription>
              Last {logs.length} change{logs.length === 1 ? "" : "s"} to this product.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {dateTimeFmt.format(l.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.actor?.name ?? l.actor?.email ?? "system"}
                      </TableCell>
                      <TableCell><code className="text-xs">{l.field}</code></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[12rem] truncate">
                        {l.oldValue ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[12rem] truncate">
                        {l.newValue ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
