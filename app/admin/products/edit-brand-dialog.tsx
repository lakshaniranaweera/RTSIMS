"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateBrand, type BrandFormState } from "./brand-actions";
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

export function EditBrandDialog({
  brand,
}: {
  brand: { id: string; name: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<BrandFormState, FormData>(
    updateBrand,
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
          <input type="hidden" name="id" value={brand.id} />
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
            <DialogDescription>
              Renaming will also update the slug.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-4">
            <Label htmlFor={`brand-name-${brand.id}`}>Name</Label>
            <Input
              id={`brand-name-${brand.id}`}
              name="name"
              defaultValue={brand.name}
              required
              disabled={pending}
            />
            {fe.name?.[0] && (
              <p className="text-xs text-destructive">{fe.name[0]}</p>
            )}
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
