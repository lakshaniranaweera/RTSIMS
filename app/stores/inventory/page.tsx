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
import { IssueStockDialog } from "./issue-dialog";

const LOCATION_TONE = {
  OFFICE: "bg-violet-500 text-white",
  STORE: "bg-sky-500 text-white",
} as const;

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const DAY = 24 * 60 * 60 * 1000;

export default async function StoresInventoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "menu.inventory"))) {
    redirect("/login");
  }

  const products = await prisma.product.findMany({
    where: { archived: false },
    orderBy: [{ qty: "asc" }, { name: "asc" }],
    include: { category: { select: { name: true } } },
  });

  const lowCount = products.filter((p) => p.qty < p.minStock).length;
  const outCount = products.filter((p) => p.qty === 0).length;
  const expiringCount = products.filter(
    (p) =>
      p.expiryDate &&
      p.expiryDate.getTime() - Date.now() >= 0 &&
      p.expiryDate.getTime() - Date.now() <= 90 * DAY,
  ).length;

  return (
    <AppShell title="Stores · Inventory">
      <div className="space-y-4 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live inventory</CardTitle>
            <CardDescription>
              {products.length} active products ·{" "}
              <span className="text-amber-700">{lowCount} low stock</span> ·{" "}
              <span className="text-red-700">{outCount} out of stock</span> ·{" "}
              {expiringCount} expiring ≤ 90d
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      No active products in inventory.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => {
                    const low = p.qty < p.minStock;
                    const out = p.qty === 0;
                    const rowTone = out
                      ? "bg-red-50/60 dark:bg-red-500/10"
                      : low
                      ? "bg-amber-50/60 dark:bg-amber-500/10"
                      : "";
                    return (
                      <TableRow key={p.id} className={rowTone}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.category.name}
                        </TableCell>
                        <TableCell>
                          <Badge className={LOCATION_TONE[p.location]}>{p.location}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {out ? (
                            <Badge className="bg-red-500 text-white">0</Badge>
                          ) : low ? (
                            <span className="text-amber-700 font-medium">{p.qty}</span>
                          ) : (
                            p.qty
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {p.minStock}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.expiryDate ? dateFmt.format(p.expiryDate) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <IssueStockDialog
                            productId={p.id}
                            productName={p.name}
                            inStock={p.qty}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
