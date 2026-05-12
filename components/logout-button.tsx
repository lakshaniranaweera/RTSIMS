"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth-actions)/logout-action";
import { useTransition } from "react";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => logout())}
    >
      {pending ? "Signing out…" : "Log out"}
    </Button>
  );
}
