import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddUserForm } from "./add-user-form";
import { RowActions } from "./row-actions";
import type { Role } from "@prisma/client";

const ROLE_TONE: Record<Role, string> = {
  ADMIN: "bg-blue-500 text-white",
  STORES: "bg-amber-500 text-white",
  STAFF: "bg-emerald-500 text-white",
};

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "menu.employees"))) {
    redirect("/admin");
  }

  const users = await prisma.user.findMany({
    orderBy: [{ deletedAt: "asc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  return (
    <AppShell title="Employees">
      <div className="space-y-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a user</CardTitle>
            <CardDescription>
              Creates an account with a temporary password. The user can sign in immediately and change it later. Fine-grained menu permissions can be set after creation under{" "}
              <a className="underline" href="/admin/permissions/users">
                Manage permissions · By user
              </a>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddUserForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All users</CardTitle>
            <CardDescription>
              {users.filter((u) => !u.deletedAt).length} active ·{" "}
              {users.filter((u) => u.deletedAt).length} deleted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={u.deletedAt ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_TONE[u.role]}>{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dateFmt.format(u.createdAt)}
                    </TableCell>
                    <TableCell>
                      {u.deletedAt ? (
                        <Badge variant="outline">deleted</Badge>
                      ) : (
                        <Badge className="bg-emerald-500 text-white">active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        userId={u.id}
                        isDeleted={!!u.deletedAt}
                        isSelf={u.id === session.user.id}
                      />
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
