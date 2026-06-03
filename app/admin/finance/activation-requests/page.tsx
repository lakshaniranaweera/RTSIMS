import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
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
import { Button } from "@/components/ui/button";
import { ActivationStatusBadge } from "../activation/status";
import {
  AcceptActivationButton,
  RejectActivationButton,
} from "./status-actions";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ActivationRequestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const canApprove = await hasPermission(session.user.id, "finance.activation.approve");
  if (!canApprove) redirect("/admin");

  const [pending, history] = await Promise.all([
    prisma.activation.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        jobNumber: true,
        eventDate: true,
        status: true,
        createdAt: true,
        createdBy: { select: { name: true } },
      },
    }),
    prisma.activation.findMany({
      where: { status: { in: ["ACCEPTED", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        jobNumber: true,
        eventDate: true,
        status: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
      },
    }),
  ]);

  const eventDateFmt = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  return (
    <AppShell title="Activation Requests">
      <div className="space-y-4 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>Pending Activations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Job #</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                        No pending activations.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pending.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/finance/activation/${a.id}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {a.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{a.jobNumber}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {eventDateFmt.format(a.eventDate)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.createdBy.name}
                        </TableCell>
                        <TableCell>
                          <ActivationStatusBadge status={a.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {dateFmt.format(a.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <AcceptActivationButton id={a.id} />
                            <RejectActivationButton id={a.id} />
                            <Button
                              render={<Link href={`/admin/finance/activation/${a.id}`} />}
                              nativeButton={false}
                              size="sm"
                              variant="outline"
                            >
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Job #</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                        No reviewed activations yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/finance/activation/${a.id}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {a.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{a.jobNumber}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {eventDateFmt.format(a.eventDate)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.createdBy.name}
                        </TableCell>
                        <TableCell>
                          <ActivationStatusBadge status={a.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.reviewedBy?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {dateFmt.format(a.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            render={<Link href={`/admin/finance/activation/${a.id}`} />}
                            nativeButton={false}
                            size="sm"
                            variant="outline"
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
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
