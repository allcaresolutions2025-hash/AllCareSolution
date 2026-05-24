import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { accrueCommissionsForOrder } from "@/lib/commission";
import { z } from "zod";

const bodySchema = z.object({
  orderId: z.string(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.razorpayOrderId !== razorpayOrderId) {
    return NextResponse.json({ error: "Order/payment mismatch" }, { status: 400 });
  }
  if (order.status === "PAID") {
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
  }

  const valid = verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
  if (!valid) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // Mark paid, decrement stock, accrue commissions in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        razorpayPaymentId,
        razorpaySignature,
      },
    });
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }
    await accrueCommissionsForOrder(order.id, tx);
  });

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber, orderId: order.id });
}
