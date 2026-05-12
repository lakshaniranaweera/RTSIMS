import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
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
import { toggleRolePermission } from "./actions";

const ROLES: Role[] = [Role.ADMIN, Role.STORES, Role.STAFF];

export default async function RolesPermissionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "permissions.manage"))) {
    redirect("/admin");
  }

  const [permissions, rolePerms] = await Promise.all([
    prisma.permission.findMany({ orderBy: [{ group: "asc" }, { label: "asc" }] }),
    prisma.rolePermission.findMany({ select: { role: true, permissionId: true } }),
  ]);

  const granted = new Set(rolePerms.map((rp) => `${rp.role}:${rp.permissionId}`));

  // Group permissions for readable rendering
  const groups = new Map<string, typeof permissions>();
  for (const p of permissions) {
    const k = p.group ?? "Other";
    const list = groups.get(k) ?? [];
    list.push(p);
    groups.set(k, list);
  }

  return (
    <AppShell title="Permissions · By role">
      <div className="space-y-6 max-w-5xl">
        <p className="text-sm text-muted-foreground">
          Toggle the cells to grant or revoke a permission for an entire role.
          Per-user overrides take precedence — manage those under{" "}
          <a className="underline" href="/admin/permissions/users">By user</a>.
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
                    <TableHead className="w-[40%]">Permission</TableHead>
                    {ROLES.map((r) => (
                      <TableHead key={r} className="text-center">
                        {r}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perms.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.label}</div>
                        <div className="text-xs text-muted-foreground">
                          <code>{p.key}</code>
                          {p.description ? ` · ${p.description}` : null}
                        </div>
                      </TableCell>
                      {ROLES.map((r) => {
                        const isOn = granted.has(`${r}:${p.id}`);
                        return (
                          <TableCell key={r} className="text-center">
                            <form action={toggleRolePermission}>
                              <input type="hidden" name="role" value={r} />
                              <input type="hidden" name="permissionId" value={p.id} />
                              <input type="hidden" name="grant" value={isOn ? "0" : "1"} />
                              <button
                                type="submit"
                                aria-label={`${isOn ? "Revoke" : "Grant"} ${p.label} for ${r}`}
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
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
