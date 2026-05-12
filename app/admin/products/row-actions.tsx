"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { archiveProduct, unarchiveProduct } from "./actions";
import { Button } from "@/components/ui/button";

export function ProductRowActions({
  productId,
  archived,
}: {
  productId: string;
  archived: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const submit = (action: typeof archiveProduct, label: string, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    const fd = new FormData();
    fd.set("id", productId);
    startTransition(async () => {
      try {
        await action(fd);
        toast.success(label);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <div className="flex justify-end gap-1">
      <Button
        render={<Link href={`/admin/products/${productId}`} />}
        nativeButton={false}
        size="sm"
        variant="outline"
      >
        Edit
      </Button>
      {archived ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => submit(unarchiveProduct, "Restored")}
        >
          Restore
        </Button>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => submit(archiveProduct, "Archived", "Archive this product?")}
        >
          Archive
        </Button>
      )}
    </div>
  );
}
