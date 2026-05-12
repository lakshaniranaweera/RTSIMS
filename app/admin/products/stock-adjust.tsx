"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { adjustStock } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StockAdjust({ productId }: { productId: string }) {
  const [delta, setDelta] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) {
      toast.error("Enter a non-zero integer (e.g. 5 or -3).");
      return;
    }
    const fd = new FormData();
    fd.set("id", productId);
    fd.set("delta", String(Math.trunc(n)));
    startTransition(async () => {
      const res = await adjustStock(fd);
      if (res.ok) {
        toast.success(`Stock adjusted by ${n > 0 ? "+" : ""}${Math.trunc(n)}`);
        setDelta("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  };

  return (
    <div className="flex items-end gap-2">
      <div className="grid gap-1">
        <label htmlFor="delta" className="text-xs text-muted-foreground">
          Adjust by (e.g. +10, -3)
        </label>
        <Input
          id="delta"
          type="number"
          step={1}
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          disabled={pending}
          className="w-32"
        />
      </div>
      <Button onClick={submit} disabled={pending || delta === ""} size="sm">
        {pending ? "Adjusting…" : "Apply"}
      </Button>
    </div>
  );
}
