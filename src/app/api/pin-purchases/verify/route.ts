import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { generateUniquePinCode } from "@/lib/referral";
import { z } from "zod";

const bodySchema = z.object({
  purchaseId: z.string(),
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
  const { purchaseId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const purchase = await prisma.pinPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase || purchase.userId !== session.user.id) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }
  if (purchase.razorpayOrderId !== razorpayOrderId) {
    return NextResponse.json({ error: "Order/payment mismatch" }, { status: 400 });
  }
  if (purchase.status === "PAID") {
    return NextResponse.json({ ok: true, alreadyPaid: true, pinsIssued: purchase.quantity });
  }

  const valid = verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
  if (!valid) {
    await prisma.pinPurchase.update({
      where: { id: purchase.id },
      data: { status: "FAILED", razorpayPaymentId, razorpaySignature },
    });
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // Mint unique pin codes outside the transaction (each code does its own
  // uniqueness check via findUnique). Generate up-front so all codes exist
  // before we open the write transaction.
  const codes: string[] = [];
  for (let i = 0; i < purchase.quantity; i++) {
    codes.push(await generateUniquePinCode());
  }

  await prisma.$transaction(async (tx) => {
    await tx.pinPurchase.update({
      where: { id: purchase.id },
      data: {
        status: "PAID",
        razorpayPaymentId,
        razorpaySignature,
        paidAt: new Date(),
      },
    });
    await tx.pin.createMany({
      data: codes.map((code) => ({
        code,
        ownerId: purchase.userId,
        purchaseId: purchase.id,
        status: "ACTIVE" as const,
      })),
    });
  });

  return NextResponse.json({ ok: true, pinsIssued: codes.length });
}
