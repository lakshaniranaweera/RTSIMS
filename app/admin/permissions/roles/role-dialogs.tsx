"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    if (!confirm(`Delete role "${name}"? This cannot be undone.`)) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      try {
        await deleteRole(fd);
        toast.success(`Deleted role "${name}"`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete role.");
      }
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled || pending}
      title={disabled ? disabledReason : undefined}
      onClick={onClick}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 />
      Delete
    </Button>
  );
}
