import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRazorpay } from "@/lib/razorpay";
import { getSetting } from "@/lib/settings";
import { toPaise } from "@/lib/money";
import { isLeader, LEADER_DOWNLINE_THRESHOLD } from "@/lib/leader";
import { z } from "zod";

const bodySchema = z.object({
  quantity: z.number().int().min(1).max(100),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, "Mobile must be 10 digits"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, leftLegCount: true, rightLegCount: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!isLeader({ leftLegCount: user.leftLegCount, rightLegCount: user.rightLegCount })) {
    return NextResponse.json(
      { error: `Razorpay pin purchase is available only to Leaders (${LEADER_DOWNLINE_THRESHOLD}+ members in downline).` },
      { status: 403 },
    );
  }

  const pinPriceInr = await getSetting("PIN_PRICE_INR");
  const pricePerPin = toPaise(pinPriceInr);
  if (!pricePerPin || pricePerPin <= 0) {
    return NextResponse.json({ error: "Pin price not configured" }, { status: 500 });
  }
  const totalAmount = pricePerPin * parsed.data.quantity;

  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }

  const rzp = getRazorpay();
  const rzpOrder = await rzp.orders.create({
    amount: totalAmount, // paise
    currency: "INR",
    notes: {
      kind: "pin_purchase",
      userId: user.id,
      quantity: String(parsed.data.quantity),
    },
  });

  const purchase = await prisma.pinPurchase.create({
    data: {
      userId: user.id,
      quantity: parsed.data.quantity,
      mobileNumber: parsed.data.mobileNumber,
      pricePerPin,
      totalAmount,
      razorpayOrderId: rzpOrder.id,
    },
  });

  return NextResponse.json({
    ok: true,
    purchaseId: purchase.id,
    razorpayKeyId: keyId,
    razorpayOrderId: rzpOrder.id,
    amount: totalAmount,
    currency: "INR",
    quantity: parsed.data.quantity,
    pricePerPin,
    prefill: {
      name: user.name,
      email: user.email,
      contact: user.phone ?? parsed.data.mobileNumber,
    },
  });
}
