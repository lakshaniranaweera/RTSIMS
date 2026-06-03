"use client";

import Link from "next/link";
import { Check, Circle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FormStatus = { formNumber: number; filled: boolean };

export function ActionDropdown({
  activationId,
  forms,
}: {
  activationId: string;
  forms: FormStatus[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
        Forms <ChevronDown className="ml-1 size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {forms.map((f) => (
          <DropdownMenuItem key={f.formNumber} render={<Link href={`/admin/finance/activation/${activationId}/form/${f.formNumber}`} />}>
            {f.filled ? (
              <Check className="mr-2 size-4 text-emerald-500" />
            ) : (
              <Circle className="mr-2 size-4 text-muted-foreground" />
            )}
            Form {f.formNumber}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
