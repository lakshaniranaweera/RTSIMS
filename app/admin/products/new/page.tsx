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
import { Button } from "@/components/ui/button";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "menu.products"))) {
    redirect("/admin");
  }

  const [categories, suppliers] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <AppShell title="New product">
      <div className="max-w-3xl">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Add a product</CardTitle>
              <CardDescription>
                Fields marked with required are mandatory. You can adjust stock and archive the product later.
              </CardDescription>
            </div>
            <Button render={<Link href="/admin/products" />} nativeButton={false} variant="outline" size="sm">
              ← Back
            </Button>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-sm text-destructive">
                Create at least one category before adding products.
              </p>
            ) : (
              <ProductForm
                mode="create"
                categories={categories}
                suppliers={suppliers}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
