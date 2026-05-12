import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getNotifications,
  syncExpiryNotifications,
} from "@/lib/notifications";
import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MarkReadButton,
  MarkAllReadButton,
  ViewLink,
} from "@/components/notification-actions";

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await hasPermission(session.user.id, "menu.notifications"))) {
    redirect("/login");
  }

  // Refresh expiry alerts whenever the page loads (cheap & idempotent for admins).
  if (session.user.role === "ADMIN") {
    await syncExpiryNotifications();
  }

  const items = await getNotifications(session.user.id);
  const unread = items.filter((n) => !n.read).length;

  return (
    <AppShell title="Notifications">
      <div className="max-w-3xl space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Inbox</CardTitle>
              <CardDescription>
                {items.length} notification{items.length === 1 ? "" : "s"} ·{" "}
                <span className={unread > 0 ? "font-medium text-foreground" : ""}>
                  {unread} unread
                </span>
              </CardDescription>
            </div>
            <MarkAllReadButton disabled={unread === 0} />
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No notifications.
              </p>
            ) : (
              <ul className="divide-y">
                {items.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 py-3">
                    <div className="mt-1.5">
                      <span
                        className={
                          "inline-block size-2 rounded-full " +
                          (n.read ? "bg-muted" : "bg-blue-500")
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            n.type === "EXPIRY_WARNING" ? "border-amber-500 text-amber-700" : ""
                          }
                        >
                          {n.type.toLowerCase().replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {dateTimeFmt.format(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{n.message}</p>
                    </div>
                    <div className="flex gap-1">
                      {n.link && <ViewLink href={n.link} />}
                      {!n.read && <MarkReadButton id={n.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
