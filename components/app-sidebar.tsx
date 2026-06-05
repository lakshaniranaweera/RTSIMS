import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getEffectivePermissions } from "@/lib/permissions";
import { SIDEBAR_ITEMS } from "@/lib/sidebar-config";
import { AppSidebarNav } from "@/components/app-sidebar-nav";
import { LogoutButton } from "@/components/logout-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Boxes } from "lucide-react";

export async function AppSidebar() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const perms = await getEffectivePermissions(session.user.id);
  const visible = SIDEBAR_ITEMS.filter((item) => {
    if (item.requiresAny) return item.requiresAny.some((k) => perms.has(k));
    return perms.has(item.key);
  }).map(
    (item) => {
      const Icon = item.icon;
      return {
        key: item.key,
        label: item.label,
        href: item.href,
        group: item.group,
        icon: <Icon />,
      };
    },
  );

  const initials =
    (session.user.name ?? session.user.email ?? "?")
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Boxes className="size-4" />
          </div>
          <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">IMS</span>
            <span className="text-xs text-muted-foreground">Inventory · Requests</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <AppSidebarNav items={visible} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-1 py-1">
          <Avatar className="size-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{session.user.name}</span>
            <div className="flex items-center gap-1">
              {session.user.roleName && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {session.user.roleName}
                </Badge>
              )}
              <span className="truncate text-xs text-muted-foreground">{session.user.email}</span>
            </div>
          </div>
        </div>
        <div className="px-1 pb-1 group-data-[collapsible=icon]:hidden">
          <LogoutButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
