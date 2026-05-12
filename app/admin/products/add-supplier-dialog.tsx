"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { createSupplier, type SupplierFormState } from "./supplier-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export function AddSupplierDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<SupplierFormState, FormData>(
    createSupplier,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      setOpen(false);
    }
  }, [state]);

  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus />
        Add Supplier
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
            <DialogDescription>
              Only the name is required. Contact details are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="sup-name">Name</Label>
              <Input id="sup-name" name="name" required disabled={pending} />
              {fe.name?.[0] && <p className="text-xs text-destructive">{fe.name[0]}</p>}
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="sup-contact">Contact name</Label>
                <Input id="sup-contact" name="contactName" disabled={pending} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sup-phone">Phone</Label>
                <Input id="sup-phone" name="phone" disabled={pending} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sup-email">Email</Label>
              <Input
                id="sup-email"
                name="email"
                type="email"
                placeholder="contact@example.com"
                disabled={pending}
              />
              {fe.email?.[0] && <p className="text-xs text-destructive">{fe.email[0]}</p>}
            </div>
            {state && !state.ok && state.error && !state.fieldErrors && (
              <p className="text-xs text-destructive">{state.error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
