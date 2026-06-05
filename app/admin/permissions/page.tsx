import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, ShieldCheck } from "lucide-react";

export default async function PermissionsIndex() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "permissions.manage"))) {
    redirect("/admin");
  }

  return (
    <AppShell title="Manage Permissions">
      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        <Link href="/admin/permissions/roles" className="block">
          <Card className="hover:border-primary transition-colors h-full">
            <CardHeader>
              <ShieldCheck className="size-6 text-primary" />
              <CardTitle className="mt-2">Roles</CardTitle>
              <CardDescription>
                Create roles and grant permissions per section.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Add, edit, or remove roles and choose which menu items each one sees.
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/permissions/users" className="block">
          <Card className="hover:border-primary transition-colors h-full">
            <CardHeader>
              <Users className="size-6 text-primary" />
              <CardTitle className="mt-2">By user</CardTitle>
              <CardDescription>
                Per-user overrides on top of the role defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Force a permission on (ALLOW) or off (DENY) for a specific user.
            </CardContent>
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}
