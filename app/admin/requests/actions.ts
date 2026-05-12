"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RequestStatus, ReturnStatus, ItemCondition } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission, hasPermission } from "@/lib/permissions";

export type ActionState =
  | { ok: true; message: string; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
  | undefined;

const ALLOWED: Partial<Record<RequestStatus, RequestStatus[]>> = {
  PENDING: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PACKING"],
  PACKING: ["READY_TO_DELIVER"],
  READY_TO_DELIVER: ["SENT"],
  SENT: ["RECEIVED"],
};

function assertTransition(from: RequestStatus, to: RequestStatus) {
  if (!ALLOWED[from]?.includes(to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`);
  }
}

const optStr = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t === "" || t === "__none__" ? null : t;
  },
  z.string().nullable(),
);

const ItemSchema = z.object({
  productId: z.string().min(1, "Pick a product."),
  qty: z.coerce.number().int().positive("Quantity must be at least 1."),
});

const CreateRequestSchema = z.object({
  activationName: z.string().trim().min(1, "Activation name is required."),
  jobNumber: optStr,
  brandId: optStr,
  clientName: optStr,
  note: optStr,
  items: z.array(ItemSchema).min(1, "Add at least one item."),
});

function parseItems(formData: FormData): Array<{ productId: string; qty: number }> {
  const productIds = formData.getAll("itemProductId").map((v) => String(v));
  const qtys = formData.getAll("itemQty").map((v) => String(v));
  const items: Array<{ productId: string; qty: number }> = [];
  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i]?.trim();
    const qty = Number(qtys[i] ?? 0);
    if (!productId || !qty) continue;
    items.push({ productId, qty });
  }
  return items;
}

export async function createRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requirePermission("requests.form");

  const parsed = CreateRequestSchema.safeParse({
    activationName: formData.get("activationName"),
    jobNumber: formData.get("jobNumber"),
    brandId: formData.get("brandId"),
    clientName: formData.get("clientName"),
    note: formData.get("note"),
    items: parseItems(formData),
  });

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: fe };
  }

  const data = parsed.data;

  const products = await prisma.product.findMany({
    where: { id: { in: data.items.map((i) => i.productId) } },
    select: { id: true, qty: true, archived: true },
  });
  const map = new Map(products.map((p) => [p.id, p]));
  for (const it of data.items) {
    const p = map.get(it.productId);
    if (!p) return { ok: false, error: `Product ${it.productId} not found.` };
    if (p.archived) return { ok: false, error: "One of the selected items is archived." };
    if (it.qty > p.qty) {
      return { ok: false, error: `Requested qty (${it.qty}) exceeds available stock for one item.` };
    }
  }

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const r = await tx.request.create({
        data: {
          staffId: userId,
          status: "PENDING",
          activationName: data.activationName,
          jobNumber: data.jobNumber,
          brandId: data.brandId,
          clientName: data.clientName,
          note: data.note,
          items: {
            create: data.items.map((i) => ({ productId: i.productId, qty: i.qty })),
          },
        },
        select: { id: true },
      });
      await tx.requestEvent.create({
        data: { requestId: r.id, status: "PENDING", actorId: userId },
      });
      return r;
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create request." };
  }

  revalidatePath("/admin/requests");
  return { ok: true, message: "Request submitted.", id: created.id };
}

async function transitionStatus(
  requestId: string,
  to: RequestStatus,
  opts: { permissionKey?: string; reason?: string | null; vehicleNumber?: string | null; ownerOnly?: boolean } = {},
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  const userId = session.user.id;

  if (opts.permissionKey) {
    const ok = await hasPermission(userId, opts.permissionKey);
    if (!ok) return { ok: false, error: `Forbidden: ${opts.permissionKey}` };
  }

  const existing = await prisma.request.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, staffId: true, items: { select: { productId: true, qty: true } } },
  });
  if (!existing) return { ok: false, error: "Request not found." };

  if (opts.ownerOnly && existing.staffId !== userId) {
    return { ok: false, error: "Only the requester can perform this action." };
  }

  try {
    assertTransition(existing.status, to);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid transition." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (to === "SENT") {
        if (!opts.vehicleNumber || !opts.vehicleNumber.trim()) {
          throw new Error("Vehicle number is required when marking as sent.");
        }
        for (const item of existing.items) {
          const res = await tx.product.updateMany({
            where: { id: item.productId, qty: { gte: item.qty } },
            data: { qty: { decrement: item.qty } },
          });
          if (res.count === 0) {
            throw new Error("Insufficient stock for one or more items.");
          }
        }
      }

      const updateData: {
        status: RequestStatus;
        processedById?: string;
        vehicleNumber?: string;
      } = { status: to };
      if (to === "ACCEPTED") updateData.processedById = userId;
      if (to === "SENT") updateData.vehicleNumber = opts.vehicleNumber!.trim();

      await tx.request.update({ where: { id: requestId }, data: updateData });

      await tx.requestEvent.create({
        data: {
          requestId,
          status: to,
          actorId: userId,
          reason: opts.reason ?? null,
        },
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update status." };
  }

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
  return { ok: true, message: `Request ${to.toLowerCase().replace(/_/g, " ")}.` };
}

export async function acceptRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing request id." };
  return transitionStatus(id, "ACCEPTED", { permissionKey: "requests.pending" });
}

export async function rejectRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return { ok: false, error: "Missing request id." };
  if (!reason) return { ok: false, error: "Rejection reason is required.", fieldErrors: { reason: ["Reason is required."] } };
  return transitionStatus(id, "REJECTED", { permissionKey: "requests.pending", reason });
}

export async function startPacking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing request id." };
  return transitionStatus(id, "PACKING", { permissionKey: "requests.pending" });
}

export async function markReadyToDeliver(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing request id." };
  return transitionStatus(id, "READY_TO_DELIVER", { permissionKey: "requests.pending" });
}

export async function markSent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const vehicleNumber = String(formData.get("vehicleNumber") ?? "").trim();
  if (!id) return { ok: false, error: "Missing request id." };
  if (!vehicleNumber) {
    return { ok: false, error: "Vehicle number is required.", fieldErrors: { vehicleNumber: ["Required."] } };
  }
  return transitionStatus(id, "SENT", { permissionKey: "requests.pending", vehicleNumber });
}

export async function markReceived(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing request id." };
  return transitionStatus(id, "RECEIVED", { ownerOnly: true });
}

const ReturnItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().min(0),
  condition: z.enum(["GOOD", "DAMAGED"]),
});

export async function createReturn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
  const userId = session.user.id;

  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return { ok: false, error: "Missing request id." };
  const note = String(formData.get("note") ?? "").trim() || null;

  const productIds = formData.getAll("itemProductId").map((v) => String(v));
  const qtys = formData.getAll("itemQty").map((v) => String(v));
  const conds = formData.getAll("itemCondition").map((v) => String(v));
  const items: Array<{ productId: string; qty: number; condition: "GOOD" | "DAMAGED" }> = [];
  for (let i = 0; i < productIds.length; i++) {
    const parsed = ReturnItemSchema.safeParse({
      productId: productIds[i],
      qty: qtys[i],
      condition: conds[i],
    });
    if (!parsed.success) {
      return { ok: false, error: "Invalid return item." };
    }
    if (parsed.data.qty > 0) items.push(parsed.data);
  }
  if (items.length === 0) {
    return { ok: false, error: "At least one item must have qty > 0." };
  }

  const req = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      staffId: true,
      items: { select: { productId: true, qty: true } },
    },
  });
  if (!req) return { ok: false, error: "Request not found." };
  if (req.staffId !== userId) return { ok: false, error: "Only the requester can open a return." };
  if (req.status !== "RECEIVED") return { ok: false, error: "Returns can only be opened on received requests." };

  const origByProduct = new Map(req.items.map((i) => [i.productId, i.qty]));
  for (const it of items) {
    const orig = origByProduct.get(it.productId) ?? 0;
    if (it.qty > orig) {
      return { ok: false, error: `Return qty for one item exceeds the original requested qty (${orig}).` };
    }
  }

  let created;
  try {
    created = await prisma.returnRequest.create({
      data: {
        requestId,
        initiatedById: userId,
        status: "PENDING",
        note,
        items: { create: items.map((i) => ({ productId: i.productId, qty: i.qty, condition: i.condition })) },
      },
      select: { id: true },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to open return." };
  }

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
  return { ok: true, message: "Return submitted for review.", id: created.id };
}

export async function acceptReturn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await requirePermission("requests.pending");

  const returnId = String(formData.get("returnId") ?? "");
  if (!returnId) return { ok: false, error: "Missing return id." };

  const ret = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    select: {
      id: true,
      status: true,
      requestId: true,
      items: { select: { productId: true, qty: true, condition: true, id: true } },
    },
  });
  if (!ret) return { ok: false, error: "Return not found." };
  if (ret.status !== "PENDING") return { ok: false, error: "Return has already been reviewed." };

  try {
    await prisma.$transaction(async (tx) => {
      for (const it of ret.items) {
        if (it.condition === ItemCondition.GOOD) {
          await tx.product.update({
            where: { id: it.productId },
            data: { qty: { increment: it.qty } },
          });
        } else {
          await tx.damagedStock.create({
            data: {
              productId: it.productId,
              qty: it.qty,
              returnItemId: it.id,
            },
          });
        }
      }
      await tx.returnRequest.update({
        where: { id: returnId },
        data: {
          status: ReturnStatus.ACCEPTED,
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to accept return." };
  }

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${ret.requestId}`);
  revalidatePath(`/admin/requests/returns/${returnId}`);
  return { ok: true, message: "Return accepted. Stock updated." };
}

export async function rejectReturn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await requirePermission("requests.pending");

  const returnId = String(formData.get("returnId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!returnId) return { ok: false, error: "Missing return id." };
  if (!reason) return { ok: false, error: "Rejection reason is required.", fieldErrors: { reason: ["Reason is required."] } };

  const ret = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    select: { id: true, status: true, requestId: true },
  });
  if (!ret) return { ok: false, error: "Return not found." };
  if (ret.status !== "PENDING") return { ok: false, error: "Return has already been reviewed." };

  try {
    await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: ReturnStatus.REJECTED,
        reviewedById: userId,
        reviewedAt: new Date(),
        reason,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reject return." };
  }

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${ret.requestId}`);
  revalidatePath(`/admin/requests/returns/${returnId}`);
  return { ok: true, message: "Return rejected." };
}
