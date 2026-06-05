import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StoresDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "menu.requests.admin"))) {
    redirect("/login");
  }

  return (
    <AppShell title="Stores · Dashboard">
      <Card>
        <CardHeader>
          <CardTitle>Stores workspace</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Inventory, packing queue, suppliers, and expiry alerts will live here. Hooked up in later phases.
        </CardContent>
      </Card>
    </AppShell>
  );
}
