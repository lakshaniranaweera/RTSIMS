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
import { ActivationForm } from "./activation-form";
import { ActivationStatusBadge } from "./status";
import { FormsProgress } from "./forms-progress";
import { ActionDropdown } from "./action-dropdown";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export default async function ActivationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const canCreate = await hasPermission(session.user.id, "finance.activation.create");
  if (!canCreate) redirect("/admin");

  const activations = await prisma.activation.findMany({
    where: { createdById: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      jobNumber: true,
      eventDate: true,
      status: true,
      createdAt: true,
      forms: {
        select: { formNumber: true, filled: true },
        orderBy: { formNumber: "asc" },
      },
    },
  });

  return (
    <AppShell title="Activation">
      <div className="space-y-4 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle>New Activation</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivationForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Activations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Job #</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Forms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        No activations yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activations.map((a) => {
                      const filledCount = a.forms.filter((f) => f.filled).length;
                      return (
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
                            {dateFmt.format(a.eventDate)}
                          </TableCell>
                          <TableCell>
                            <FormsProgress filled={filledCount} />
                          </TableCell>
                          <TableCell>
                            <ActivationStatusBadge status={a.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              <ActionDropdown activationId={a.id} forms={a.forms} />
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
                      );
                    })
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
