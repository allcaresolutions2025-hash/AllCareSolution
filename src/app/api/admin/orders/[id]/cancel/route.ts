import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { reverseCommissionsForOrder } from "@/lib/commission";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Restock items if order was paid
  if (order.status === "PAID") {
    for (const it of order.items) {
      await prisma.product.update({
        where: { id: it.productId },
        data: { stock: { increment: it.quantity } },
      });
    }
    await reverseCommissionsForOrder(order.id);
  }
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
