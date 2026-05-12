"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createUser, type CreateUserState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddUserForm() {
  const [state, formAction, pending] = useActionState<CreateUserState, FormData>(
    createUser,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      formRef.current?.reset();
    } else if (state && !state.ok && state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state]);

  const fieldErrs = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" placeholder="Jane Doe" required disabled={pending} />
        {fieldErrs.name?.[0] && (
          <p className="text-xs text-destructive">{fieldErrs.name[0]}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="jane@company.test"
          required
          disabled={pending}
        />
        {fieldErrs.email?.[0] && (
          <p className="text-xs text-destructive">{fieldErrs.email[0]}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Temporary password</Label>
        <Input
          id="password"
          name="password"
          type="text"
          placeholder="At least 8 characters"
          required
          minLength={8}
          disabled={pending}
        />
        {fieldErrs.password?.[0] && (
          <p className="text-xs text-destructive">{fieldErrs.password[0]}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="role">Role</Label>
        <Select name="role" defaultValue="STAFF" disabled={pending}>
          <SelectTrigger id="role">
            <SelectValue placeholder="Pick a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
            <SelectItem value="STORES">STORES</SelectItem>
            <SelectItem value="STAFF">STAFF</SelectItem>
          </SelectContent>
        </Select>
        {fieldErrs.role?.[0] && (
          <p className="text-xs text-destructive">{fieldErrs.role[0]}</p>
        )}
      </div>
      <div className="sm:col-span-2 flex items-center justify-end gap-2">
        {state && !state.ok && state.error && (
          <p className="mr-auto text-sm text-destructive">{state.error}</p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create user"}
        </Button>
      </div>
    </form>
  );
}
