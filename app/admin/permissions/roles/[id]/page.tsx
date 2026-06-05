import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { toggleRolePermission } from "../actions";

export default async function RolePermissionsEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "permissions.manage"))) {
    redirect("/admin");
  }

  const role = await prisma.role.findUnique({
    where: { id },
    select: { id: true, name: true, description: true, isSystem: true },
  });
  if (!role) notFound();

  const [permissions, rolePerms] = await Promise.all([
    prisma.permission.findMany({ orderBy: [{ group: "asc" }, { label: "asc" }] }),
    prisma.rolePermission.findMany({
      where: { roleId: id },
      select: { permissionId: true },
    }),
  ]);

  const granted = new Set(rolePerms.map((rp) => rp.permissionId));

  const groups = new Map<string, typeof permissions>();
  for (const p of permissions) {
    const k = p.group ?? "Other";
    const list = groups.get(k) ?? [];
    list.push(p);
    groups.set(k, list);
  }

  return (
    <AppShell title={`Role · ${role.name}`}>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold">
              {role.name}
              {role.isSystem && <Badge variant="outline">system</Badge>}
            </div>
            {role.description && (
              <div className="text-sm text-muted-foreground">{role.description}</div>
            )}
          </div>
          <Button
            render={<Link href="/admin/permissions/roles" />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            ← All roles
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Toggle a permission ON or off for this role. Each card below is a section of
          the system.
        </p>

        {[...groups.entries()].map(([group, perms]) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="text-base">{group}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70%]">Permission</TableHead>
                    <TableHead className="text-right">Granted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perms.map((p) => {
                    const isOn = granted.has(p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.label}</div>
                          <div className="text-xs text-muted-foreground">
                            <code>{p.key}</code>
                            {p.description ? ` · ${p.description}` : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <form action={toggleRolePermission} className="inline-block">
                            <input type="hidden" name="roleId" value={role.id} />
                            <input type="hidden" name="permissionId" value={p.id} />
                            <input type="hidden" name="grant" value={isOn ? "0" : "1"} />
                            <button
                              type="submit"
                              aria-label={`${isOn ? "Revoke" : "Grant"} ${p.label}`}
                              className={
                                "inline-flex h-6 w-12 items-center justify-center rounded-md border text-xs font-medium transition-colors " +
                                (isOn
                                  ? "bg-emerald-500 text-white border-emerald-600"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80")
                              }
                            >
                              {isOn ? "ON" : "off"}
                            </button>
                          </form>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
