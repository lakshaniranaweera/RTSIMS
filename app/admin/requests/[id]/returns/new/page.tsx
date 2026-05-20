import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { ReturnForm } from "./return-form";

export default async function NewReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { id } = await params;

  const req = await prisma.request.findUnique({
    where: { id },
    select: {
      id: true,
      staffId: true,
      status: true,
      activationName: true,
      items: {
        include: { product: { select: { id: true, name: true } } },
      },
      returns: {
        where: { status: { in: ["PENDING", "ACCEPTED"] } },
        select: {
          status: true,
          items: { select: { productId: true, qty: true } },
        },
      },
    },
  });
  if (!req) notFound();
  if (req.staffId !== userId) redirect(`/admin/requests/${id}`);
  if (req.status !== "RECEIVED") redirect(`/admin/requests/${id}`);
  // If a PENDING return already exists, sequential rule blocks opening another.
  if (req.returns.some((r) => r.status === "PENDING")) redirect(`/admin/requests/${id}`);

  // Compute remaining returnable qty per product:
  //   remaining = original − Σ qty in ACCEPTED returns (PENDING already blocks here)
  const remainingByProduct = new Map<string, number>(
    req.items.map((i) => [i.productId, i.qty]),
  );
  for (const ret of req.returns) {
    for (const ri of ret.items) {
      const cur = remainingByProduct.get(ri.productId) ?? 0;
      remainingByProduct.set(ri.productId, cur - ri.qty);
    }
  }

  const lines = req.items
    .map((i) => ({
      productId: i.productId,
      productName: i.product.name,
      requestedQty: i.qty,
      remainingQty: Math.max(0, remainingByProduct.get(i.productId) ?? 0),
    }))
    .filter((l) => l.remainingQty > 0);

  return (
    <AppShell title="Open return">
      <div className="space-y-4 max-w-4xl">
        <Link
          href={`/admin/requests/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to request
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Return for: {req.activationName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Adjust quantities and mark each item as Good or Damaged. Good items will
              be added back to stock once accepted; damaged items will be logged
              separately. You can submit multiple partial returns over time.
            </p>
          </CardHeader>
          <CardContent>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All items from this request have already been returned.
              </p>
            ) : (
              <ReturnForm requestId={req.id} items={lines} />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
