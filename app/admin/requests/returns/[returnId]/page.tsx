import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { ReturnBadge } from "../../status";
import { AcceptReturnButton, RejectReturnButton } from "./review-actions";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ReturnReviewPage({
  params,
}: {
  params: Promise<{ returnId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const perms = await getEffectivePermissions(session.user.id);

  const { returnId } = await params;
  const ret = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: {
      request: {
        select: { id: true, activationName: true, staff: { select: { name: true } } },
      },
      initiatedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      items: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });
  if (!ret) notFound();

  const canReview = perms.has("requests.pending");
  const isOwner = ret.initiatedById === session.user.id;
  if (!canReview && !isOwner && !perms.has("requests.history")) {
    redirect("/admin/requests");
  }

  return (
    <AppShell title="Return review">
      <div className="space-y-4 max-w-4xl">
        <Link
          href={`/admin/requests/${ret.requestId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to request
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Return for: {ret.request.activationName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Opened {dateFmt.format(ret.createdAt)} by {ret.initiatedBy.name}
                </p>
              </div>
              <ReturnBadge status={ret.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {ret.note && (
              <div>
                <p className="text-xs text-muted-foreground">Note</p>
                <p className="text-sm whitespace-pre-wrap">{ret.note}</p>
              </div>
            )}
            {ret.reason && (
              <div>
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="text-sm whitespace-pre-wrap">{ret.reason}</p>
              </div>
            )}
            {ret.reviewedBy && (
              <p className="text-sm text-muted-foreground">
                Reviewed by {ret.reviewedBy.name}
                {ret.reviewedAt ? ` on ${dateFmt.format(ret.reviewedAt)}` : ""}
              </p>
            )}

            {canReview && ret.status === "PENDING" && (
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <AcceptReturnButton returnId={ret.id} />
                <RejectReturnButton returnId={ret.id} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Condition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ret.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.product.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{it.qty}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          it.condition === "GOOD"
                            ? "bg-emerald-500 text-white"
                            : "bg-red-500 text-white"
                        }
                      >
                        {it.condition}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
