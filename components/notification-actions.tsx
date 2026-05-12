"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/notifications/actions";
import { Button } from "@/components/ui/button";

export function MarkReadButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("id", id);
        startTransition(async () => {
          try {
            await markNotificationRead(fd);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
    >
      Mark read
    </Button>
  );
}

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending || disabled}
      onClick={() =>
        startTransition(async () => {
          try {
            await markAllNotificationsRead();
            toast.success("All notifications marked read");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        })
      }
    >
      {pending ? "Marking…" : "Mark all read"}
    </Button>
  );
}

export function ViewLink({ href }: { href: string }) {
  return (
    <Button render={<Link href={href} />} nativeButton={false} size="sm" variant="outline">
      View
    </Button>
  );
}
