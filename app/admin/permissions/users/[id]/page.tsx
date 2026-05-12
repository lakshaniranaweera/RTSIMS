import { notFound, redirect } from "next/navigation";
import Link from "next/link";
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
import { setUserPermission } from "./actions";
import type { Role } from "@prisma/client";

const ROLE_TONE: Record<Role, string> = {
  ADMIN: "bg-blue-500 text-white",
  STORES: "bg-amber-500 text-white",
  STAFF: "bg-emerald-500 text-white",
};

export default async function UserPermissionsEditor({
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

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, deletedAt: true },
  });
  if (!user || user.deletedAt) notFound();

  const [permissions, rolePerms, userPerms] = await Promise.all([
    prisma.permission.findMany({ orderBy: [{ group: "asc" }, { label: "asc" }] }),
    prisma.rolePermission.findMany({
      where: { role: user.role },
      select: { permissionId: true },
    }),
    prisma.userPermission.findMany({
      where: { userId: id },
      select: { permissionId: true, effect: true },
    }),
  ]);

  const roleGrantedIds = new Set(rolePerms.map((r) => r.permissionId));
  const overrideMap = new Map(userPerms.map((u) => [u.permissionId, u.effect]));

  const groups = new Map<string, typeof permissions>();
  for (const p of permissions) {
    const k = p.group ?? "Other";
    const list = groups.get(k) ?? [];
    list.push(p);
    groups.set(k, list);
  }

  return (
    <AppShell title={`Permissions · ${user.name}`}>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{user.name}</div>
            <div className="text-sm text-muted-foreground">
              {user.email} ·{" "}
              <Badge className={ROLE_TONE[user.role]}>{user.role}</Badge>
            </div>
          </div>
          <Button
            render={<Link href="/admin/permissions/users" />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            ← All users
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          For each permission, pick <b>Inherit</b> (use the role default),{" "}
          <b>ALLOW</b> (force on), or <b>DENY</b> (force off). Inherit removes any
          per-user override.
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
                    <TableHead>Role default</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead className="text-right">Override</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perms.map((p) => {
                    const roleHas = roleGrantedIds.has(p.id);
                    const override = overrideMap.get(p.id) ?? null;
                    const effective =
                      override === "ALLOW" ? true : override === "DENY" ? false : roleHas;
                    const current: "INHERIT" | "ALLOW" | "DENY" = override ?? "INHERIT";

                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.label}</div>
                          <div className="text-xs text-muted-foreground">
                            <code>{p.key}</code>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {roleHas ? (
                            <span className="text-emerald-600">granted</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {effective ? (
                            <Badge className="bg-emerald-500 text-white">visible</Badge>
                          ) : (
                            <Badge variant="outline">hidden</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {(["INHERIT", "ALLOW", "DENY"] as const).map((eff) => {
                              const active = current === eff;
                              const tone =
                                active && eff === "ALLOW"
                                  ? "bg-emerald-500 text-white border-emerald-600"
                                  : active && eff === "DENY"
                                  ? "bg-red-500 text-white border-red-600"
                                  : active
                                  ? "bg-foreground text-background"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80";
                              return (
                                <form key={eff} action={setUserPermission}>
                                  <input type="hidden" name="userId" value={user.id} />
                                  <input type="hidden" name="permissionId" value={p.id} />
                                  <input type="hidden" name="effect" value={eff} />
                                  <button
                                    type="submit"
                                    disabled={active}
                                    className={
                                      "inline-flex h-7 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors " +
                                      tone
                                    }
                                  >
                                    {eff === "INHERIT" ? "Inherit" : eff}
                                  </button>
                                </form>
                              );
                            })}
                          </div>
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
