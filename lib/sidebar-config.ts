import {
  LayoutDashboard,
  Users,
  Boxes,
  ClipboardList,
  FileBarChart,
  Search,
  Bell,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type SidebarItem = {
  /** Permission key. Visible only if the user's effective permissions include this key. */
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** UI grouping for the sidebar. */
  group: "Admin" | "Staff" | "System";
  /** Optional human-readable description, used in the permission management UI. */
  description?: string;
  /** If set, the item is visible when the user has ANY of these permission keys (overrides `key`). */
  requiresAny?: string[];
};

/** Feature permissions that are not surfaced as sidebar items but are gated independently. */
export const EXTRA_PERMISSIONS: Array<{
  key: string;
  label: string;
  group: string;
  description: string;
}> = [
  {
    key: "requests.form",
    label: "Submit Request Form",
    group: "Requests",
    description: "Create new item requests.",
  },
  {
    key: "requests.approve",
    label: "Approve / Reject Requests",
    group: "Requests",
    description: "Accept or reject pending requests.",
  },
  {
    key: "requests.fulfill",
    label: "Fulfill Requests",
    group: "Requests",
    description: "Pack, mark ready, dispatch requests, and review returns.",
  },
  {
    key: "requests.history",
    label: "View Request History",
    group: "Requests",
    description: "Browse all historical requests.",
  },
];

/** Single source of truth for sidebar items + the permission keys that gate them. */
export const SIDEBAR_ITEMS: SidebarItem[] = [
  // Admin (Company view)
  { key: "menu.dashboard.admin", label: "Dashboard", href: "/admin", icon: LayoutDashboard, group: "Admin", description: "Admin company overview." },
  { key: "menu.employees", label: "Employees", href: "/admin/employees", icon: Users, group: "Admin", description: "Manage employee accounts." },
  { key: "menu.products", label: "Products", href: "/admin/products", icon: Boxes, group: "Admin", description: "Company-wide product catalogue." },
  {
    key: "menu.requests.admin",
    label: "Requests",
    href: "/admin/requests",
    icon: ClipboardList,
    group: "Admin",
    description: "Submit, process, and review requests.",
    requiresAny: ["requests.form", "requests.approve", "requests.fulfill", "requests.history"],
  },
  { key: "menu.reports", label: "Reports", href: "/admin/reports", icon: FileBarChart, group: "Admin", description: "Usage, inventory, delivery reports." },

  // Staff
  { key: "menu.browse", label: "Browse", href: "/staff", icon: Search, group: "Staff", description: "Browse the catalogue." },

  // System (visible to all by default — all roles get notifications)
  { key: "menu.notifications", label: "Notifications", href: "/notifications", icon: Bell, group: "System", description: "Notification centre." },

  // Permission management (gated by permissions.manage)
  { key: "permissions.manage", label: "Manage Permissions", href: "/admin/permissions", icon: ShieldCheck, group: "System", description: "Grant or revoke menu items per role or per user." },
];

/** Default role grants used at seed time and by the permission management defaults UI. */
export const DEFAULT_ROLE_PERMISSIONS: Record<"ADMIN" | "STORES" | "STAFF", string[]> = {
  ADMIN: [
    "menu.dashboard.admin",
    "menu.employees",
    "menu.products",
    "menu.requests.admin",
    "menu.reports",
    "menu.notifications",
    "permissions.manage",
    "requests.form",
    "requests.approve",
    "requests.fulfill",
    "requests.history",
  ],
  STORES: [
    "menu.notifications",
    "menu.requests.admin",
    "requests.fulfill",
    "requests.history",
  ],
  STAFF: [
    "menu.browse",
    "menu.notifications",
    "menu.requests.admin",
    "requests.form",
    "requests.history",
  ],
};
