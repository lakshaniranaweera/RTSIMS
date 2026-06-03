"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  approveActivation,
  rejectActivation,
  type ActionState,
} from "../activation/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

function useToastResult(state: ActionState) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      router.refresh();
    } else if (state && !state.ok && state.error) {
      toast.error(state.error);
    }
  }, [state, router]);
}

export function AcceptActivationButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    approveActivation,
    undefined,
  );
  useToastResult(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Working…" : "Accept"}
      </Button>
    </form>
  );
}

export function RejectActivationButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    rejectActivation,
    undefined,
  );
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    } else if (state && !state.ok && state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" />}>
        Reject
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject activation</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" required disabled={pending} />
            {state && !state.ok && state.fieldErrors?.reason?.[0] && (
              <p className="text-xs text-destructive">{state.fieldErrors.reason[0]}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
