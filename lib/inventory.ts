import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Atomically decrements a product's stock by `qty` and writes a ProductLog row.
 * Throws if qty <= 0, the product is missing, or stock would go negative.
 */
export async function issueStock(args: {
  productId: string;
  qty: number;
  actorId: string;
}) {
  const { productId, qty, actorId } = args;
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
    throw new Error("Issue qty must be a positive integer.");
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, qty: true, archived: true },
    });
    if (!product) throw new Error("Product not found.");
    if (product.archived) throw new Error("Cannot issue stock of an archived product.");
    if (product.qty < qty) {
      throw new Error(`Only ${product.qty} in stock; cannot issue ${qty}.`);
    }

    const next = product.qty - qty;
    await tx.product.update({ where: { id: productId }, data: { qty: next } });
    await tx.productLog.create({
      data: {
        productId,
        field: "qty",
        oldValue: String(product.qty),
        newValue: String(next),
        actorId,
      },
    });
    return { name: product.name, before: product.qty, after: next };
  });
}
