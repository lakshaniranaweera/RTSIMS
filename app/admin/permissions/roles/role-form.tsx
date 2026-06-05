"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { createRole, updateRole, type RoleFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type RoleDefaults = {
  id?: string;
  name?: string;
  description?: string | null;
  landingPath?: string | null;
};

export function RoleForm({
  mode,
  defaults = {},
  landingOptions,
  onSuccess,
}: {
  mode: "create" | "edit";
  defaults?: RoleDefaults;
  landingOptions: { href: string; label: string }[];
  onSuccess?: (id?: string) => void;
}) {
  const action = mode === "create" ? createRole : updateRole;
  const [state, formAction, pending] = useActionState<RoleFormState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      onSuccess?.(state.id);
    } else if (state && !state.ok && state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, onSuccess]);

  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="grid gap-4">
      {mode === "edit" && <input type="hidden" name="id" value={defaults.id} />}

      <div className="grid gap-1.5">
        <Label htmlFor="name">Role name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Finance"
          defaultValue={defaults.name ?? ""}
          required
          disabled={pending}
        />
        {fe.name?.[0] && <p className="text-xs text-destructive">{fe.name[0]}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          placeholder="What this role is for (optional)"
          defaultValue={defaults.description ?? ""}
          disabled={pending}
        />
        {fe.description?.[0] && (
          <p className="text-xs text-destructive">{fe.description[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="landingPath">Landing page after login</Label>
        <Input
          id="landingPath"
          name="landingPath"
          list="landing-options"
          placeholder="Auto — first accessible page"
          defaultValue={defaults.landingPath ?? ""}
          disabled={pending}
        />
        <datalist id="landing-options">
          {landingOptions.map((o) => (
            <option key={o.href} value={o.href}>
              {o.label}
            </option>
          ))}
        </datalist>
        <p className="text-xs text-muted-foreground">
          Leave blank to send users to the first page their permissions allow.
        </p>
        {fe.landingPath?.[0] && (
          <p className="text-xs text-destructive">{fe.landingPath[0]}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {state && !state.ok && state.error && (
          <p className="mr-auto text-sm text-destructive">{state.error}</p>
        )}
        <Button type="submit" disabled={pending}>
          {pending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create role"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
