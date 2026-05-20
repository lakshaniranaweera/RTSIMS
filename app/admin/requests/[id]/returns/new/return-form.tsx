"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createReturn, type ActionState } from "../../../actions";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Item = {
  productId: string;
  productName: string;
  requestedQty: number;
  remainingQty: number;
};

export function ReturnForm({
  requestId,
  items,
}: {
  requestId: string;
  items: Item[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createReturn,
    undefined,
  );
  const router = useRouter();
  const [lines, setLines] = useState(
    items.map((i) => ({ ...i, qty: 0, condition: "GOOD" as "GOOD" | "DAMAGED" })),
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      router.push(`/admin/requests/${requestId}`);
    } else if (state && !state.ok && state.error) {
      toast.error(state.error);
    }
  }, [state, router, requestId]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Remaining to return</TableHead>
            <TableHead className="w-40">Return qty</TableHead>
            <TableHead className="w-40">Condition</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, idx) => (
            <TableRow key={line.productId}>
              <TableCell className="font-medium">{line.productName}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                <span className="font-medium text-foreground">{line.remainingQty}</span>
                <span className="ml-1 text-xs">of {line.requestedQty}</span>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  max={line.remainingQty}
                  placeholder={`0–${line.remainingQty}`}
                  value={line.qty}
                  onChange={(e) =>
                    setLines((ls) =>
                      ls.map((l, i) =>
                        i === idx
                          ? { ...l, qty: Math.max(0, Math.min(line.remainingQty, Number(e.target.value) || 0)) }
                          : l,
                      ),
                    )
                  }
                  disabled={pending}
                />
                <input type="hidden" name="itemProductId" value={line.productId} />
                <input type="hidden" name="itemQty" value={line.qty} />
              </TableCell>
              <TableCell>
                <Select
                  value={line.condition}
                  onValueChange={(v) =>
                    setLines((ls) =>
                      ls.map((l, i) =>
                        i === idx ? { ...l, condition: v as "GOOD" | "DAMAGED" } : l,
                      ),
                    )
                  }
                  disabled={pending}
                  items={[
                    { value: "GOOD", label: "Good" },
                    { value: "DAMAGED", label: "Damaged" },
                  ]}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="itemCondition" value={line.condition} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="grid gap-1.5">
        <Label htmlFor="note">Note</Label>
        <textarea
          id="note"
          name="note"
          rows={2}
          disabled={pending}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-3"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={pending || lines.every((l) => l.qty === 0)}>
          {pending ? "Submitting…" : "Submit return"}
        </Button>
      </div>
    </form>
  );
}
