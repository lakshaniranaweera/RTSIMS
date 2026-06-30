"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setUserPermission } from "./actions";

type Effect = "INHERIT" | "ALLOW" | "DENY";

export function OverrideButtons({
  userId,
  permissionId,
  current,
}: {
  userId: string;
  permissionId: string;
  current: Effect;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const apply = (effect: Effect) => {
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("permissionId", permissionId);
    fd.set("effect", effect);
    startTransition(async () => {
      try {
        await setUserPermission(fd);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update override.");
      }
    });
  };

  return (
    <div className="flex justify-end gap-1">
      {(["INHERIT", "ALLOW", "DENY"] as const).map((eff) => {
        const active = current === eff;
        const tone =
          active && eff === "ALLOW"
            ? "bg-emerald-500 text-white border-emerald-600"
            : active && eff === "DENY"
              ? "bg-red-500 text-white border-red-600"
              : active
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80";
        return (
          <button
            key={eff}
            type="button"
            disabled={active || pending}
            onClick={() => apply(eff)}
            className={
              "inline-flex h-7 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors disabled:opacity-60 " +
              tone
            }
          >
            {eff === "INHERIT" ? "Inherit" : eff}
          </button>
        );
      })}
    </div>
  );
}
