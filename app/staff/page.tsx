import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StaffDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STAFF") redirect("/login");

  return (
    <AppShell title="Staff · Browse">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {session.user.name?.split(" ")[0] ?? "there"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Browse the catalogue, build a request cart, and track your requests. Hooked up in later phases.
        </CardContent>
      </Card>
    </AppShell>
  );
}
