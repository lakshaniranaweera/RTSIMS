import Link from "next/link";
import { redirect } from "next/navigation";
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
import { RequestsTabs, type RequestsTab } from "./tabs";
import { RequestForm } from "./request-form";
import { StatusBadge } from "./status";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const perms = await getEffectivePermissions(session.user.id);
  const canForm = perms.has("requests.form");
  const canPending = perms.has("requests.pending");
  const canHistory = perms.has("requests.history");

  if (!canForm && !canPending && !canHistory) {
    redirect("/admin");
  }

  const available: RequestsTab[] = [];
  if (canForm) available.push("form");
  if (canPending) available.push("pending");
  if (canHistory) available.push("history");

  const sp = await searchParams;
  const requested = sp.tab;
  let active: RequestsTab =
    requested === "form" || requested === "pending" || requested === "history"
      ? requested
      : available[0];
  if (!available.includes(active)) active = available[0];

  return (
    <AppShell title="Requests">
      <div className="space-y-4 max-w-6xl">
        <RequestsTabs active={active} available={available} />

        {active === "form" && canForm && <FormSection />}
        {active === "pending" && canPending && <PendingSection />}
        {active === "history" && canHistory && (
          <HistorySection userId={session.user.id} canViewAll={canPending} />
        )}
      </div>
    </AppShell>
  );
}

async function FormSection() {
  const [products, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where: { archived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, qty: true, categoryId: true, fixedAsset: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New request</CardTitle>
      </CardHeader>
      <CardContent>
        <RequestForm products={products} categories={categories} brands={brands} />
      </CardContent>
    </Card>
  );
}

async function PendingSection() {
  const requests = await prisma.request.findMany({
    where: {
      status: { notIn: ["RECEIVED", "REJECTED"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      activationName: true,
      jobNumber: true,
      clientName: true,
      vehicleNumber: true,
      createdAt: true,
      staff: { select: { name: true, email: true } },
      processedBy: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending requests</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activation</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Job #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Processed by</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                    Nothing pending.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/requests/${r.id}`} className="hover:underline">
                        {r.activationName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.staff.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.jobNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.clientName ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{r._count.items}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.vehicleNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.processedBy?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {dateFmt.format(r.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

async function HistorySection({
  userId,
  canViewAll,
}: {
  userId: string;
  canViewAll: boolean;
}) {
  const requests = await prisma.request.findMany({
    where: canViewAll ? {} : { staffId: userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      status: true,
      activationName: true,
      jobNumber: true,
      clientName: true,
      createdAt: true,
      staff: { select: { name: true } },
      _count: { select: { items: true, returns: true } },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request history</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activation</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Job #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Returns</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    No requests yet.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/requests/${r.id}`} className="hover:underline">
                        {r.activationName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.staff.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.jobNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.clientName ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{r._count.items}</TableCell>
                    <TableCell className="tabular-nums">
                      {r._count.returns > 0 ? r._count.returns : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {dateFmt.format(r.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
