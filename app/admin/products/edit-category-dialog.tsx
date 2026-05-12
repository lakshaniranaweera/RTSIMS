"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateCategory, type CategoryFormState } from "./category-actions";
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

export function EditCategoryDialog({
  category,
}: {
  category: { id: string; name: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CategoryFormState, FormData>(
    updateCategory,
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
          <input type="hidden" name="id" value={category.id} />
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Renaming will also update the slug.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-4">
            <Label htmlFor={`cat-name-${category.id}`}>Name</Label>
            <Input
              id={`cat-name-${category.id}`}
              name="name"
              defaultValue={category.name}
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
