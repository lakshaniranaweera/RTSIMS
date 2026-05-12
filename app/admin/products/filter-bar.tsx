"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ALL = "__all__";

export function FilterBar({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const categoryId = sp.get("categoryId") ?? ALL;
  const showArchived = sp.get("showArchived") === "true";

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      const cur = sp.get("q") ?? "";
      if (cur === q) return;
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`);
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value == null || value === "" || value === ALL) next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1.5 grow min-w-[14rem]">
        <Label htmlFor="q" className="text-xs">Search by name</Label>
        <Input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="A4 Paper, USB-C, …"
          disabled={pending}
        />
      </div>
      <div className="grid gap-1.5 min-w-[12rem]">
        <Label className="text-xs">Category</Label>
        <Select
          value={categoryId}
          onValueChange={(v) => updateParam("categoryId", v)}
          disabled={pending}
          items={[
            { value: ALL, label: "All categories" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm select-none">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) =>
            updateParam("showArchived", e.target.checked ? "true" : null)
          }
          className="size-4"
        />
        Show archived
      </label>
    </div>
  );
}
