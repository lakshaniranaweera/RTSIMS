"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export type ActionState =
  | { ok: true; message: string; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
  | undefined;

const CreateActivationSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  jobNumber: z.string().trim().min(1, "Job number is required."),
  eventDate: z.coerce.date({ error: "Event date is required." }),
});

export async function createActivation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requirePermission("finance.activation.create");

  const parsed = CreateActivationSchema.safeParse({
    name: formData.get("name"),
    jobNumber: formData.get("jobNumber"),
    eventDate: formData.get("eventDate"),
  });

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: fe };
  }

  const data = parsed.data;

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const activation = await tx.activation.create({
        data: {
          name: data.name,
          jobNumber: data.jobNumber,
          eventDate: data.eventDate,
          createdById: userId,
        },
        select: { id: true },
      });
      await tx.activationForm.createMany({
        data: [1, 2, 3, 4].map((n) => ({
          activationId: activation.id,
          formNumber: n,
        })),
      });
      return activation;
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create activation." };
  }

  revalidatePath("/admin/finance/activation");
  revalidatePath("/admin/finance/activation-requests");
  return { ok: true, message: "Activation created.", id: created.id };
}

export async function approveActivation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requirePermission("finance.activation.approve");

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing activation id." };

  const existing = await prisma.activation.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Activation not found." };
  if (existing.status !== "PENDING") {
    return { ok: false, error: "Only pending activations can be approved." };
  }

  try {
    await prisma.activation.update({
      where: { id },
      data: { status: "ACCEPTED", reviewedById: userId },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to approve activation." };
  }

  revalidatePath("/admin/finance/activation");
  revalidatePath("/admin/finance/activation-requests");
  revalidatePath(`/admin/finance/activation/${id}`);
  return { ok: true, message: "Activation accepted." };
}

export async function rejectActivation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requirePermission("finance.activation.approve");

  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return { ok: false, error: "Missing activation id." };
  if (!reason) {
    return { ok: false, error: "Rejection reason is required.", fieldErrors: { reason: ["Reason is required."] } };
  }

  const existing = await prisma.activation.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Activation not found." };
  if (existing.status !== "PENDING") {
    return { ok: false, error: "Only pending activations can be rejected." };
  }

  try {
    await prisma.activation.update({
      where: { id },
      data: { status: "REJECTED", reviewedById: userId, reviewNote: reason },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reject activation." };
  }

  revalidatePath("/admin/finance/activation");
  revalidatePath("/admin/finance/activation-requests");
  revalidatePath(`/admin/finance/activation/${id}`);
  return { ok: true, message: "Activation rejected." };
}
