import {
  LayoutDashboard,
  Users,
  Boxes,
  ClipboardList,
  FileBarChart,
  Search,
  Bell,
  ShieldCheck,
  Banknote,
  FileCheck,
  type LucideIcon,
} from "lucide-react";

export type SidebarItem = {
  /** Permission key. Visible only if the user's effective permissions include this key. */
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** UI grouping for the sidebar. */
  group: "Admin" | "Staff" | "System" | "Finance";
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
  {
    key: "finance.activation.create",
    label: "Create Activations",
    group: "Finance",
    description: "Submit new activation requests.",
  },
  {
    key: "finance.activation.approve",
    label: "Approve / Reject Activations",
    group: "Finance",
    description: "Accept or reject pending activations.",
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

  // Finance
  {
    key: "menu.finance.activation",
    label: "Activation",
    href: "/admin/finance/activation",
    icon: Banknote,
    group: "Finance",
    description: "Create and track activations.",
    requiresAny: ["finance.activation.create"],
  },
  {
    key: "menu.finance.activation-requests",
    label: "Activation Requests",
    href: "/admin/finance/activation-requests",
    icon: FileCheck,
    group: "Finance",
    description: "Review and approve activation requests.",
    requiresAny: ["finance.activation.approve"],
  },

  // Permission management (gated by permissions.manage)
  { key: "permissions.manage", label: "Manage Permissions", href: "/admin/permissions", icon: ShieldCheck, group: "System", description: "Create roles and grant or revoke permissions per role or per user." },
];
