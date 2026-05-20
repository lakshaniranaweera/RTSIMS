"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  acceptRequest,
  rejectRequest,
  startPacking,
  markReadyToDeliver,
  markSent,
  markReceived,
  type ActionState,
} from "./actions";
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

function SimpleActionButton({
  action,
  id,
  label,
  variant = "default",
}: {
  action: typeof acceptRequest;
  id: string;
  label: string;
  variant?: "default" | "outline" | "destructive" | "secondary";
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );
  useToastResult(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" disabled={pending} variant={variant} size="sm">
        {pending ? "Working…" : label}
      </Button>
    </form>
  );
}

export function AcceptButton({ id }: { id: string }) {
  return <SimpleActionButton action={acceptRequest} id={id} label="Accept" />;
}

export function StartPackingButton({ id }: { id: string }) {
  return <SimpleActionButton action={startPacking} id={id} label="Start packing" />;
}

export function MarkReadyButton({ id }: { id: string }) {
  return (
    <SimpleActionButton action={markReadyToDeliver} id={id} label="Ready to deliver" />
  );
}

export function MarkReceivedButton({ id }: { id: string }) {
  return (
    <SimpleActionButton
      action={markReceived}
      id={id}
      label="Mark received"
      variant="default"
    />
  );
}

export function RejectButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    rejectRequest,
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
          <DialogTitle>Reject request</DialogTitle>
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

export function MarkSentDialog({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    markSent,
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
      <DialogTrigger render={<Button size="sm" />}>Mark sent</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispatch request</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-1.5">
            <Label htmlFor="vehicleNumber">Vehicle number 1</Label>
            <Input
              id="vehicleNumber"
              name="vehicleNumber"
              required
              disabled={pending}
              placeholder="e.g. KA-01-AB-1234"
            />
            {state && !state.ok && state.fieldErrors?.vehicleNumber?.[0] && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.vehicleNumber[0]}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="vehicleNumber2">Vehicle number 2 (optional)</Label>
            <Input
              id="vehicleNumber2"
              name="vehicleNumber2"
              disabled={pending}
              placeholder="e.g. KA-01-CD-5678"
            />
            <p className="text-xs text-muted-foreground">
              Stock will be decremented for all items in this request.
            </p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Dispatching…" : "Confirm dispatch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
