"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateSupplier, type SupplierFormState } from "./supplier-actions";
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
import { Pencil } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
};

export function EditSupplierDialog({ supplier }: { supplier: Supplier }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<SupplierFormState, FormData>(
    updateSupplier,
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
        <Pencil />
        Edit
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <input type="hidden" name="id" value={supplier.id} />
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Update the supplier's contact details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`sup-name-${supplier.id}`}>Name</Label>
              <Input
                id={`sup-name-${supplier.id}`}
                name="name"
                defaultValue={supplier.name}
                required
                disabled={pending}
              />
              {fe.name?.[0] && <p className="text-xs text-destructive">{fe.name[0]}</p>}
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`sup-contact-${supplier.id}`}>Contact name</Label>
                <Input
                  id={`sup-contact-${supplier.id}`}
                  name="contactName"
                  defaultValue={supplier.contactName ?? ""}
                  disabled={pending}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`sup-phone-${supplier.id}`}>Phone</Label>
                <Input
                  id={`sup-phone-${supplier.id}`}
                  name="phone"
                  defaultValue={supplier.phone ?? ""}
                  disabled={pending}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`sup-email-${supplier.id}`}>Email</Label>
              <Input
                id={`sup-email-${supplier.id}`}
                name="email"
                type="email"
                defaultValue={supplier.email ?? ""}
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
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
