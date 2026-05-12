"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteCategory } from "./category-actions";
import { deleteSupplier } from "./supplier-actions";
import { deleteBrand } from "./brand-actions";

type Kind = "category" | "supplier" | "brand";

export function TaxonomyDeleteButton({
  id,
  kind,
  inUse,
}: {
  id: string;
  kind: Kind;
  inUse: number;
}) {
  const [pending, startTransition] = useTransition();
  const action = kind === "category" ? deleteCategory : kind === "supplier" ? deleteSupplier : deleteBrand;
  const noun = kind === "category" ? "category" : kind === "supplier" ? "supplier" : "brand";

  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={pending || inUse > 0}
      title={inUse > 0 ? `${inUse} product${inUse === 1 ? "" : "s"} use this ${noun}` : undefined}
      onClick={() => {
        if (!confirm(`Delete this ${noun}?`)) return;
        const fd = new FormData();
        fd.set("id", id);
        startTransition(async () => {
          try {
            await action(fd);
            toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} deleted`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
    >
      Delete
    </Button>
  );
}
