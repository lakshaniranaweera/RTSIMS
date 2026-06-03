import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { ActivationStatusBadge } from "../status";
import { FormsProgress } from "../forms-progress";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const eventDateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export default async function ActivationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const perms = await getEffectivePermissions(userId);

  const { id } = await params;

  const activation = await prisma.activation.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
      forms: {
        orderBy: { formNumber: "asc" },
        include: { filledBy: { select: { name: true } } },
      },
    },
  });
  if (!activation) notFound();

  const isOwner = activation.createdById === userId;
  const canApprove = perms.has("finance.activation.approve");

  if (!isOwner && !canApprove) redirect("/admin");

  const filledCount = activation.forms.filter((f) => f.filled).length;

  return (
    <AppShell title="Activation Details">
      <div className="space-y-4 max-w-5xl">
        <Link
          href={canApprove ? "/admin/finance/activation-requests" : "/admin/finance/activation"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{activation.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Created {dateFmt.format(activation.createdAt)} by {activation.createdBy.name}
                </p>
              </div>
              <ActivationStatusBadge status={activation.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Job Number</dt>
                <dd className="font-medium">{activation.jobNumber}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Event Date</dt>
                <dd className="font-medium">{eventDateFmt.format(activation.eventDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Reviewed By</dt>
                <dd className="font-medium">{activation.reviewedBy?.name ?? "—"}</dd>
              </div>
              {activation.reviewNote && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Review Note</dt>
                  <dd className="whitespace-pre-wrap">{activation.reviewNote}</dd>
                </div>
              )}
            </dl>

            <div className="border-t pt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Forms Progress</span>
                <FormsProgress filled={filledCount} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Filled At</TableHead>
                  <TableHead>Filled By</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activation.forms.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">Form {f.formNumber}</TableCell>
                    <TableCell>
                      {f.filled ? (
                        <Badge className="bg-emerald-500 text-white">Filled</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {f.filledAt ? dateFmt.format(f.filledAt) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {f.filledBy?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/finance/activation/${activation.id}/form/${f.formNumber}`}
                        className="text-sm text-primary underline-offset-2 hover:underline"
                      >
                        {f.filled ? "View" : "Fill"}
                      </Link>
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
