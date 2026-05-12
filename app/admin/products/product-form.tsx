"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createProduct,
  updateProduct,
  type ProductFormState,
} from "./actions";
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

const NONE = "__none__";

type Defaults = {
  id?: string;
  name?: string;
  description?: string | null;
  categoryId?: string;
  qty?: number;
  minStock?: number;
  productDate?: Date | null;
  expiryDate?: Date | null;
  deliveryDate?: Date | null;
  supplierId?: string | null;
  location?: "OFFICE" | "STORE";
  archived?: boolean;
};

function dateInput(d: Date | null | undefined): string {
  if (!d) return "";
  // YYYY-MM-DD for <input type="date">
  return new Date(d).toISOString().slice(0, 10);
}

export function ProductForm({
  mode,
  defaults = {},
  categories,
  suppliers,
}: {
  mode: "create" | "edit";
  defaults?: Defaults;
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
}) {
  const action = mode === "create" ? createProduct : updateProduct;
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    undefined,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      if (mode === "edit") router.refresh();
    } else if (state && !state.ok && state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, mode, router]);

  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {mode === "edit" && defaults.id && (
        <input type="hidden" name="id" value={defaults.id} />
      )}

      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaults.name ?? ""}
          required
          disabled={pending}
        />
        {fe.name?.[0] && <p className="text-xs text-destructive">{fe.name[0]}</p>}
      </div>

      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaults.description ?? ""}
          disabled={pending}
          rows={2}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="categoryId">Category</Label>
        <Select
          name="categoryId"
          defaultValue={defaults.categoryId}
          disabled={pending}
          required
        >
          <SelectTrigger id="categoryId">
            <SelectValue placeholder="Pick a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fe.categoryId?.[0] && (
          <p className="text-xs text-destructive">{fe.categoryId[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="location">Location</Label>
        <Select
          name="location"
          defaultValue={defaults.location ?? "STORE"}
          disabled={pending}
          required
        >
          <SelectTrigger id="location">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OFFICE">Office</SelectItem>
            <SelectItem value="STORE">Store</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="supplierId">Supplier</Label>
        <Select
          name="supplierId"
          defaultValue={defaults.supplierId ?? NONE}
          disabled={pending}
        >
          <SelectTrigger id="supplierId">
            <SelectValue placeholder="— None —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Server treats __none__ as null via optionalString preprocessor below — handled via JS swap before submit */}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="qty">Quantity in stock</Label>
        <Input
          id="qty"
          name="qty"
          type="number"
          min={0}
          step={1}
          defaultValue={defaults.qty ?? 0}
          required
          disabled={pending}
        />
        {fe.qty?.[0] && <p className="text-xs text-destructive">{fe.qty[0]}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="minStock">Minimum stock</Label>
        <Input
          id="minStock"
          name="minStock"
          type="number"
          min={0}
          step={1}
          defaultValue={defaults.minStock ?? 0}
          required
          disabled={pending}
        />
        {fe.minStock?.[0] && (
          <p className="text-xs text-destructive">{fe.minStock[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="productDate">Product date</Label>
        <Input
          id="productDate"
          name="productDate"
          type="date"
          defaultValue={dateInput(defaults.productDate)}
          disabled={pending}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="expiryDate">Expiry date</Label>
        <Input
          id="expiryDate"
          name="expiryDate"
          type="date"
          defaultValue={dateInput(defaults.expiryDate)}
          disabled={pending}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="deliveryDate">Last delivery</Label>
        <Input
          id="deliveryDate"
          name="deliveryDate"
          type="date"
          defaultValue={dateInput(defaults.deliveryDate)}
          disabled={pending}
        />
      </div>

      {mode === "edit" && (
        <div className="grid gap-1.5">
          <Label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="archived"
              defaultChecked={defaults.archived ?? false}
              disabled={pending}
              className="size-4"
            />
            Archived
          </Label>
          <p className="text-xs text-muted-foreground">
            Archived products are hidden from staff browsing but kept for history.
          </p>
        </div>
      )}

      <div className="sm:col-span-2 flex items-center justify-end gap-2">
        {state && !state.ok && state.error && (
          <p className="mr-auto text-sm text-destructive">{state.error}</p>
        )}
        <Button type="submit" disabled={pending}>
          {pending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
            ? "Create product"
            : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
