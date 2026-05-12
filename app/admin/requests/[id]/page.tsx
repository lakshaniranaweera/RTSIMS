import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { StatusBadge, ReturnBadge, REQUEST_LABEL } from "../status";
import {
  AcceptButton,
  RejectButton,
  StartPackingButton,
  MarkReadyButton,
  MarkSentDialog,
  MarkReceivedButton,
} from "../status-actions";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const perms = await getEffectivePermissions(userId);

  const { id } = await params;

  const req = await prisma.request.findUnique({
    where: { id },
    include: {
      staff: { select: { id: true, name: true, email: true } },
      processedBy: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, qty: true } },
        },
      },
      events: {
        orderBy: { timestamp: "asc" },
        include: { actor: { select: { id: true, name: true } } },
      },
      returns: {
        orderBy: { createdAt: "desc" },
        include: {
          initiatedBy: { select: { name: true } },
          reviewedBy: { select: { name: true } },
          items: { select: { productId: true, qty: true } },
          _count: { select: { items: true } },
        },
      },
    },
  });
  if (!req) notFound();

  const isOwner = req.staffId === userId;
  const canPending = perms.has("requests.pending");
  const canHistory = perms.has("requests.history");

  if (!canPending && !canHistory && !isOwner) {
    redirect("/admin/requests");
  }

  const hasOpenReturn = req.returns.some((r) => r.status === "PENDING");
  const totalReturnedQtyByProduct = new Map<string, number>();
  for (const ret of req.returns) {
    if (ret.status !== "ACCEPTED") continue;
    for (const it of ret.items) {
      totalReturnedQtyByProduct.set(
        it.productId,
        (totalReturnedQtyByProduct.get(it.productId) ?? 0) + it.qty,
      );
    }
  }

  return (
    <AppShell title="Request">
      <div className="space-y-4 max-w-5xl">
        <Link
          href="/admin/requests"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to requests
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{req.activationName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Created {dateFmt.format(req.createdAt)} by {req.staff.name}
                </p>
              </div>
              <StatusBadge status={req.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Job number</dt>
                <dd className="font-medium">{req.jobNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Client</dt>
                <dd className="font-medium">{req.clientName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Brand</dt>
                <dd className="font-medium">{req.brand?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vehicle number</dt>
                <dd className="font-medium">{req.vehicleNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Processed by</dt>
                <dd className="font-medium">{req.processedBy?.name ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Note</dt>
                <dd className="whitespace-pre-wrap">{req.note ?? "—"}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              {canPending && req.status === "PENDING" && (
                <>
                  <AcceptButton id={req.id} />
                  <RejectButton id={req.id} />
                </>
              )}
              {canPending && req.status === "ACCEPTED" && (
                <StartPackingButton id={req.id} />
              )}
              {canPending && req.status === "PACKING" && (
                <MarkReadyButton id={req.id} />
              )}
              {canPending && req.status === "READY_TO_DELIVER" && (
                <MarkSentDialog id={req.id} />
              )}
              {isOwner && req.status === "SENT" && (
                <MarkReceivedButton id={req.id} />
              )}
              {isOwner && req.status === "RECEIVED" && !hasOpenReturn && (
                <Button
                  render={<Link href={`/admin/requests/${req.id}/returns/new`} />}
                  nativeButton={false}
                  size="sm"
                  variant="outline"
                >
                  Open return request
                </Button>
              )}
              {isOwner && req.status === "RECEIVED" && hasOpenReturn && (
                <span className="text-sm text-muted-foreground">
                  Return pending review.
                </span>
              )}
            </div>
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
                  <TableHead className="text-right">Requested</TableHead>
                  <TableHead className="text-right">Current stock</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {req.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.product.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{it.qty}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {it.product.qty}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {totalReturnedQtyByProduct.get(it.productId) ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {req.returns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opened</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed by</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {req.returns.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {dateFmt.format(r.createdAt)}
                      </TableCell>
                      <TableCell>{r.initiatedBy.name}</TableCell>
                      <TableCell className="tabular-nums">{r._count.items}</TableCell>
                      <TableCell><ReturnBadge status={r.status} /></TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.reviewedBy?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          render={<Link href={`/admin/requests/returns/${r.id}`} />}
                          nativeButton={false}
                          size="sm"
                          variant="outline"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {req.events.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <span className="w-32 shrink-0 text-xs text-muted-foreground">
                    {dateFmt.format(e.timestamp)}
                  </span>
                  <div>
                    <span className="font-medium">
                      {REQUEST_LABEL[e.status]}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      — {e.actor.name}
                    </span>
                    {e.reason && (
                      <div className="text-xs text-muted-foreground italic">
                        {e.reason}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
