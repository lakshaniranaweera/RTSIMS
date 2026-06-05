import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SIDEBAR_ITEMS } from "@/lib/sidebar-config";
import { AppShell } from "@/components/app-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { CreateRoleDialog, EditRoleDialog, DeleteRoleButton } from "./role-dialogs";

const LANDING_OPTIONS = SIDEBAR_ITEMS.map((i) => ({ href: i.href, label: i.label }));

export default async function RolesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "permissions.manage"))) {
    redirect("/admin");
  }

  const roles = await prisma.role.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      landingPath: true,
      isSystem: true,
      _count: { select: { users: true, rolePermissions: true } },
    },
  });

  return (
    <AppShell title="Permissions · Roles">
      <div className="space-y-4 max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Create roles and grant permissions per section. Per-user overrides take
            precedence — manage those under{" "}
            <Link className="underline" href="/admin/permissions/users">
              By user
            </Link>
            .
          </p>
          <CreateRoleDialog landingOptions={LANDING_OPTIONS} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Landing page</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-center">Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No roles yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
                {roles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {r.name}
                        {r.isSystem && <Badge variant="outline">system</Badge>}
                      </div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground">{r.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.landingPath ? <code>{r.landingPath}</code> : "Auto"}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {r._count.users}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {r._count.rolePermissions}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          render={<Link href={`/admin/permissions/roles/${r.id}`} />}
                          nativeButton={false}
                          size="sm"
                        >
                          <SlidersHorizontal />
                          Permissions
                        </Button>
                        <EditRoleDialog
                          role={{
                            id: r.id,
                            name: r.name,
                            description: r.description,
                            landingPath: r.landingPath,
                          }}
                          landingOptions={LANDING_OPTIONS}
                        />
                        <DeleteRoleButton
                          id={r.id}
                          name={r.name}
                          disabled={r.isSystem || r._count.users > 0}
                          disabledReason={
                            r.isSystem
                              ? "System roles cannot be deleted."
                              : "Reassign users off this role first."
                          }
                        />
                      </div>
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
