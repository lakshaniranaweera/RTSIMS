"use client";

import { useActionState, useEffect, useState } from "react";
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
  onSuccess,
}: {
  mode: "create" | "edit";
  defaults?: Defaults;
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  onSuccess?: (id?: string) => void;
}) {
  const action = mode === "create" ? createProduct : updateProduct;
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    undefined,
  );
  const router = useRouter();
  const [hasExpiry, setHasExpiry] = useState(defaults.expiryDate != null);
  const [productDate, setProductDate] = useState(dateInput(defaults.productDate));
  const [expiryDate, setExpiryDate] = useState(dateInput(defaults.expiryDate));
  const [deliveryDate, setDeliveryDate] = useState(dateInput(defaults.deliveryDate));
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      if (onSuccess) {
        onSuccess(state.id);
      } else if (mode === "create" && state.id) {
        router.push(`/admin/products/${state.id}`);
      } else if (mode === "edit") {
        router.refresh();
      }
    } else if (state && !state.ok && state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, mode, router, onSuccess]);

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
          items={categories.map((c) => ({ value: c.id, label: c.name }))}
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
          items={[
            { value: "OFFICE", label: "Office" },
            { value: "STORE", label: "Store" },
          ]}
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
          items={[
            { value: NONE, label: "— None —" },
            ...suppliers.map((s) => ({ value: s.id, label: s.name })),
          ]}
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
          value={productDate}
          onChange={(e) => setProductDate(e.target.value)}
          max={today}
          disabled={pending}
        />
        {fe.productDate?.[0] && (
          <p className="text-xs text-destructive">{fe.productDate[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasExpiry}
            onChange={(e) => {
              setHasExpiry(e.target.checked);
              if (!e.target.checked) setExpiryDate("");
            }}
            disabled={pending}
            className="size-4"
          />
          Has expiry date
        </Label>
        {hasExpiry && (
          <Input
            id="expiryDate"
            name="expiryDate"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            min={productDate || undefined}
            disabled={pending}
          />
        )}
        {hasExpiry && fe.expiryDate?.[0] && (
          <p className="text-xs text-destructive">{fe.expiryDate[0]}</p>
        )}
        {!hasExpiry && (
          <p className="text-xs text-muted-foreground">
            Item does not expire (e.g. electronics, hardware).
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="deliveryDate">Last delivery</Label>
        <Input
          id="deliveryDate"
          name="deliveryDate"
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          min={productDate || undefined}
          max={hasExpiry && expiryDate ? expiryDate : undefined}
          disabled={pending}
        />
        {fe.deliveryDate?.[0] && (
          <p className="text-xs text-destructive">{fe.deliveryDate[0]}</p>
        )}
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
