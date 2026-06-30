"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleRolePermission } from "../actions";

export function PermissionToggle({
  roleId,
  permissionId,
  label,
  isOn,
}: {
  roleId: string;
  permissionId: string;
  label: string;
  isOn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    const fd = new FormData();
    fd.set("roleId", roleId);
    fd.set("permissionId", permissionId);
    fd.set("grant", isOn ? "0" : "1");
    startTransition(async () => {
      try {
        await toggleRolePermission(fd);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update permission.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={`${isOn ? "Revoke" : "Grant"} ${label}`}
      className={
        "inline-flex h-6 w-12 items-center justify-center rounded-md border text-xs font-medium transition-colors disabled:opacity-50 " +
        (isOn
          ? "bg-emerald-500 text-white border-emerald-600"
          : "bg-muted text-muted-foreground hover:bg-muted/80")
      }
    >
      {isOn ? "ON" : "off"}
    </button>
  );
}
