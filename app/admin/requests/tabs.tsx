"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { ClipboardList, Inbox, History } from "lucide-react";
import { cn } from "@/lib/utils";

export type RequestsTab = "form" | "pending" | "history";

export function RequestsTabs({
  active,
  available,
}: {
  active: RequestsTab;
  available: RequestsTab[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const setTab = (tab: RequestsTab) => {
    const next = new URLSearchParams(sp.toString());
    next.set("tab", tab);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  };

  const all: { id: RequestsTab; label: string; icon: typeof Inbox }[] = [
    { id: "form", label: "Request Form", icon: ClipboardList },
    { id: "pending", label: "Pending Requests", icon: Inbox },
    { id: "history", label: "Request History", icon: History },
  ];

  const tabs = all.filter((t) => available.includes(t.id));
  if (tabs.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
