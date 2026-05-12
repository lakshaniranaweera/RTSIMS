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
      returns: { where: { status: "PENDING" }, select: { id: true } },
    },
  });
  if (!req) notFound();
  if (req.staffId !== userId) redirect(`/admin/requests/${id}`);
  if (req.status !== "RECEIVED") redirect(`/admin/requests/${id}`);
  if (req.returns.length > 0) redirect(`/admin/requests/${id}`);

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
              separately.
            </p>
          </CardHeader>
          <CardContent>
            <ReturnForm
              requestId={req.id}
              items={req.items.map((i) => ({
                productId: i.productId,
                productName: i.product.name,
                requestedQty: i.qty,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
