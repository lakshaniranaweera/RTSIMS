"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { RoleForm, type RoleDefaults } from "./role-form";
import { deleteRole } from "./actions";

type LandingOptions = { href: string; label: string }[];

export function CreateRoleDialog({ landingOptions }: { landingOptions: LandingOptions }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        New role
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
          <DialogDescription>
            Name the role, then assign permissions once it&apos;s created.
          </DialogDescription>
        </DialogHeader>
        <RoleForm
          mode="create"
          landingOptions={landingOptions}
          onSuccess={(id) => {
            setOpen(false);
            if (id) router.push(`/admin/permissions/roles/${id}`);
            else router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditRoleDialog({
  role,
  landingOptions,
}: {
  role: RoleDefaults;
  landingOptions: LandingOptions;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Pencil />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit role</DialogTitle>
          <DialogDescription>Update the role&apos;s details.</DialogDescription>
        </DialogHeader>
        <RoleForm
          mode="edit"
          defaults={role}
          landingOptions={landingOptions}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteRoleButton({
  id,
  name,
  disabled,
  disabledReason,
}: {
  id: string;
  name: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <form
      action={deleteRole}
      onSubmit={(e) => {
        if (!confirm(`Delete role "${name}"? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 />
        Delete
      </Button>
    </form>
  );
}
