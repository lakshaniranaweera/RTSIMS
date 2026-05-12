"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { issueStock } from "@/lib/inventory";

const IssueSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().int().positive(),
});

export async function issueStockAction(
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const { userId } = await requirePermission("menu.inventory");

  const parsed = IssueSchema.safeParse({
    productId: formData.get("productId"),
    qty: formData.get("qty"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter a positive integer quantity." };
  }

  try {
    const result = await issueStock({
      productId: parsed.data.productId,
      qty: parsed.data.qty,
      actorId: userId,
    });
    revalidatePath("/stores/inventory");
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${parsed.data.productId}`);
    return {
      ok: true,
      message: `Issued ${parsed.data.qty} of ${result.name} (${result.before} → ${result.after})`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to issue stock." };
  }
}
