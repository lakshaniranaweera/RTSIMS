"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function authedUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function markNotificationRead(formData: FormData) {
  const userId = await authedUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
  revalidatePath("/notifications");
  revalidatePath("/admin");
}

export async function markAllNotificationsRead() {
  const userId = await authedUserId();
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  revalidatePath("/notifications");
  revalidatePath("/admin");
}
