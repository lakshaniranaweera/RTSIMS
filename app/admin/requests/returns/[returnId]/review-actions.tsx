"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  acceptReturn,
  rejectReturn,
  type ActionState,
} from "../../actions";
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

export function AcceptReturnButton({ returnId }: { returnId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    acceptReturn,
    undefined,
  );
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      router.refresh();
    } else if (state && !state.ok && state.error) {
      toast.error(state.error);
    }
  }, [state, router]);
  return (
    <form action={formAction}>
      <input type="hidden" name="returnId" value={returnId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Accepting…" : "Accept return"}
      </Button>
    </form>
  );
}

export function RejectReturnButton({ returnId }: { returnId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    rejectReturn,
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
      <DialogTrigger render={<Button variant="destructive" />}>Reject</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject return</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="returnId" value={returnId} />
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
