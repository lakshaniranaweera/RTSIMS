"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Package, FolderOpen, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProductTab = "products" | "categories" | "suppliers";

export function ProductTabs({ active }: { active: ProductTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const setTab = (tab: ProductTab) => {
    const next = new URLSearchParams(sp.toString());
    if (tab === "products") next.delete("tab");
    else next.set("tab", tab);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  };

  const tabs: { id: ProductTab; label: string; icon: typeof Package }[] = [
    { id: "products", label: "Items", icon: Package },
    { id: "categories", label: "Categories", icon: FolderOpen },
    { id: "suppliers", label: "Suppliers", icon: Truck },
  ];

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
