"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createRequest, type ActionState } from "./actions";
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

type Product = {
  id: string;
  name: string;
  qty: number;
  categoryId: string;
  fixedAsset: boolean;
};

type Category = { id: string; name: string };
type Brand = { id: string; name: string };

type Line = {
  uid: number;
  fixedAssetOnly: boolean;
  categoryId: string;
  productId: string;
  search: string;
  qty: number;
};

const NONE = "__none__";

function emptyLine(uid: number): Line {
  return {
    uid,
    fixedAssetOnly: false,
    categoryId: "",
    productId: "",
    search: "",
    qty: 1,
  };
}

export function RequestForm({
  products,
  categories,
  brands,
}: {
  products: Product[];
  categories: Category[];
  brands: Brand[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createRequest,
    undefined,
  );
  const [lines, setLines] = useState<Line[]>([emptyLine(1)]);
  const [nextUid, setNextUid] = useState(2);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      setLines([emptyLine(1)]);
      setNextUid(2);
      setFormKey((k) => k + 1);
    } else if (state && !state.ok && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const addLine = () => {
    setLines((ls) => [...ls, emptyLine(nextUid)]);
    setNextUid((n) => n + 1);
  };

  const removeLine = (uid: number) => {
    setLines((ls) => (ls.length === 1 ? ls : ls.filter((l) => l.uid !== uid)));
  };

  const updateLine = (uid: number, patch: Partial<Line>) => {
    setLines((ls) =>
      ls.map((l) => {
        if (l.uid !== uid) return l;
        const next = { ...l, ...patch };
        if (("fixedAssetOnly" in patch || "categoryId" in patch) && next.productId) {
          const p = productById.get(next.productId);
          if (!p || (next.fixedAssetOnly && !p.fixedAsset) || (next.categoryId && p.categoryId !== next.categoryId)) {
            next.productId = "";
          }
        }
        return next;
      }),
    );
  };

  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form key={formKey} action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="activationName">Activation name *</Label>
          <Input
            id="activationName"
            name="activationName"
            required
            disabled={pending}
          />
          {fe.activationName?.[0] && (
            <p className="text-xs text-destructive">{fe.activationName[0]}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="jobNumber">Job number</Label>
          <Input id="jobNumber" name="jobNumber" disabled={pending} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="clientName">Client name</Label>
          <Input id="clientName" name="clientName" disabled={pending} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="brandId">Brand</Label>
          <Select
            name="brandId"
            defaultValue={NONE}
            disabled={pending}
            items={[
              { value: NONE, label: "— None —" },
              ...brands.map((b) => ({ value: b.id, label: b.name })),
            ]}
          >
            <SelectTrigger id="brandId">
              <SelectValue placeholder="— None —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— None —</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="note">Note</Label>
          <textarea
            id="note"
            name="note"
            rows={2}
            disabled={pending}
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Items</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addLine}
            disabled={pending}
          >
            <Plus className="size-4" /> Add item
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((line, idx) => {
            const visibleProducts = products.filter((p) => {
              if (line.fixedAssetOnly && !p.fixedAsset) return false;
              if (line.categoryId && p.categoryId !== line.categoryId) return false;
              if (line.search) {
                return p.name.toLowerCase().includes(line.search.toLowerCase());
              }
              return true;
            });
            const selected = line.productId ? productById.get(line.productId) : null;
            const max = selected?.qty ?? 0;

            return (
              <div
                key={line.uid}
                className="rounded-lg border bg-background p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Item {idx + 1}
                  </span>
                  {lines.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeLine(line.uid)}
                      disabled={pending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      id={`fa-${line.uid}`}
                      type="checkbox"
                      checked={line.fixedAssetOnly}
                      onChange={(e) =>
                        updateLine(line.uid, { fixedAssetOnly: e.target.checked })
                      }
                      disabled={pending}
                      className="size-4"
                    />
                    <Label htmlFor={`fa-${line.uid}`} className="font-normal">
                      Fixed asset only
                    </Label>
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Category</Label>
                    <Select
                      value={line.categoryId || NONE}
                      onValueChange={(v) => {
                        const val = typeof v === "string" ? v : "";
                        updateLine(line.uid, { categoryId: val === NONE ? "" : val });
                      }}
                      disabled={pending}
                      items={[
                        { value: NONE, label: "All categories" },
                        ...categories.map((c) => ({ value: c.id, label: c.name })),
                      ]}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>All categories</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label>Item name</Label>
                    <Input
                      placeholder="Search items by name…"
                      value={line.search}
                      onChange={(e) =>
                        setLines((ls) =>
                          ls.map((l) =>
                            l.uid === line.uid ? { ...l, search: e.target.value } : l,
                          ),
                        )
                      }
                      disabled={pending}
                    />
                    <div className="max-h-48 overflow-y-auto rounded-md border bg-background">
                      {visibleProducts.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          No items match the filters.
                        </p>
                      ) : (
                        visibleProducts.slice(0, 50).map((p) => {
                          const isSelected = line.productId === p.id;
                          return (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() =>
                                setLines((ls) =>
                                  ls.map((l) =>
                                    l.uid === line.uid ? { ...l, productId: p.id } : l,
                                  ),
                                )
                              }
                              className={
                                "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-muted " +
                                (isSelected ? "bg-muted font-medium" : "")
                              }
                            >
                              <span>
                                {p.name}
                                {p.fixedAsset && (
                                  <span className="ml-2 rounded bg-violet-100 px-1 py-0.5 text-[10px] text-violet-700">
                                    FA
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                qty {p.qty}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {selected && (
                      <p className="text-xs text-muted-foreground">
                        Selected: <span className="font-medium text-foreground">{selected.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Available qty</Label>
                    <Input value={selected ? String(selected.qty) : ""} disabled readOnly />
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      max={max || undefined}
                      value={line.qty}
                      onChange={(e) =>
                        updateLine(line.uid, { qty: Number(e.target.value) || 0 })
                      }
                      disabled={pending || !selected}
                    />
                    {selected && line.qty > selected.qty && (
                      <p className="text-xs text-destructive">
                        Exceeds available stock ({selected.qty}).
                      </p>
                    )}
                  </div>
                </div>

                {line.productId && (
                  <>
                    <input type="hidden" name="itemProductId" value={line.productId} />
                    <input type="hidden" name="itemQty" value={line.qty} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {state && !state.ok && state.error && (
          <p className="mr-auto text-sm text-destructive">{state.error}</p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit request"}
        </Button>
      </div>
    </form>
  );
}
