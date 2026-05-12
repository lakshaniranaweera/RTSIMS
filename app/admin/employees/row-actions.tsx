"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { softDeleteUser, restoreUser } from "./actions";
import { Button } from "@/components/ui/button";

export function RowActions({
  userId,
  isDeleted,
  isSelf,
}: {
  userId: string;
  isDeleted: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const submit = (action: typeof softDeleteUser, label: string) => {
    if (action === softDeleteUser && !confirm(`Soft-delete this user?`)) return;
    const fd = new FormData();
    fd.set("id", userId);
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
        render={<Link href={`/admin/permissions/users/${userId}`} />}
        nativeButton={false}
        size="sm"
        variant="outline"
        disabled={pending}
      >
        Permissions
      </Button>
      {isDeleted ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => submit(restoreUser, "Restored")}
        >
          Restore
        </Button>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          disabled={pending || isSelf}
          title={isSelf ? "You cannot delete yourself" : undefined}
          onClick={() => submit(softDeleteUser, "User soft-deleted")}
        >
          Delete
        </Button>
      )}
    </div>
  );
}
