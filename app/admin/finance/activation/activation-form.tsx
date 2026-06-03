"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createActivation, type ActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ActivationForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createActivation,
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

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required disabled={pending} placeholder="Activation name" />
          {state && !state.ok && state.fieldErrors?.name?.[0] && (
            <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="jobNumber">Job Number</Label>
          <Input id="jobNumber" name="jobNumber" required disabled={pending} placeholder="e.g. JOB-001" />
          {state && !state.ok && state.fieldErrors?.jobNumber?.[0] && (
            <p className="text-xs text-destructive">{state.fieldErrors.jobNumber[0]}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="eventDate">Date of Event</Label>
          <Input id="eventDate" name="eventDate" type="date" required disabled={pending} />
          {state && !state.ok && state.fieldErrors?.eventDate?.[0] && (
            <p className="text-xs text-destructive">{state.fieldErrors.eventDate[0]}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create Activation"}
      </Button>
    </form>
  );
}
