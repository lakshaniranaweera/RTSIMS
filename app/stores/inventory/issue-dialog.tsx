"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { issueStockAction } from "./actions";
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

export function IssueStockDialog({
  productId,
  productName,
  inStock,
}: {
  productId: string;
  productName: string;
  inStock: number;
}) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("1");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      toast.error("Enter a positive whole number.");
      return;
    }
    if (n > inStock) {
      toast.error(`Only ${inStock} in stock.`);
      return;
    }
    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("qty", String(n));
    startTransition(async () => {
      const res = await issueStockAction(fd);
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        setQty("1");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="sm" variant="outline" disabled={inStock === 0} />}
      >
        Issue
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue stock — {productName}</DialogTitle>
          <DialogDescription>
            Decrements inventory. Currently in stock:{" "}
            <span className="font-medium tabular-nums">{inStock}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5 py-4">
          <Label htmlFor="issue-qty">Quantity to issue</Label>
          <Input
            id="issue-qty"
            type="number"
            min={1}
            max={inStock}
            step={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={pending}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Issuing…" : "Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
