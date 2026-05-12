"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { createCategory, type CategoryFormState } from "./category-actions";
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

export function AddCategoryDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CategoryFormState, FormData>(
    createCategory,
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
        Add Category
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Slug is auto-generated from the name.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-4">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              name="name"
              required
              placeholder="e.g. Furniture"
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
              {pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
