import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
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
import type { Role } from "@prisma/client";

const ROLE_TONE: Record<Role, string> = {
  ADMIN: "bg-blue-500 text-white",
  STORES: "bg-amber-500 text-white",
  STAFF: "bg-emerald-500 text-white",
};

export default async function UsersPermissionsList() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "permissions.manage"))) {
    redirect("/admin");
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: { select: { permissions: true } },
    },
  });

  return (
    <AppShell title="Permissions · By user">
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Overrides</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge className={ROLE_TONE[u.role]}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{u._count.permissions}</TableCell>
                  <TableCell>
                    <Button
                      render={<Link href={`/admin/permissions/users/${u.id}`} />}
                      nativeButton={false}
                      size="sm"
                      variant="outline"
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
