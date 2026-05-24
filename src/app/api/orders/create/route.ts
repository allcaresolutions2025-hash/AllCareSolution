import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRazorpay } from "@/lib/razorpay";
import { addressSchema } from "@/lib/validation";
import { getReferralChain } from "@/lib/referral";
import { getAllBusinessSettings } from "@/lib/settings";
import { generateOrderNumber } from "@/lib/utils";
import { toPaise } from "@/lib/money";
import { z } from "zod";

const bodySchema = z.object({
  shipping: addressSchema,
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive().max(50),
    })
  ).min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { shipping, items } = parsed.data;

  // Fetch products fresh from DB — never trust client prices
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  if (products.length !== items.length) {
    return NextResponse.json({ error: "One or more products unavailable" }, { status: 400 });
  }

  const settings = await getAllBusinessSettings();
  const shippingCost = toPaise(settings.SHIPPING_COST_INR);

  let subtotal = 0;
  let gstAmount = 0;
  const itemSnapshots = items.map((it) => {
    const p = products.find((x) => x.id === it.productId)!;
    if (p.stock < it.quantity) {
      throw new Error(`Insufficient stock for ${p.name}`);
    }
    // Note: product.price is GST-inclusive. We back-calc the pre-GST line total and GST amount.
    const grossLineTotal = p.price * it.quantity;
    const preGstLine = Math.round((grossLineTotal * 100) / (100 + p.gstRate));
    const lineGst = grossLineTotal - preGstLine;
    subtotal += preGstLine;
    gstAmount += lineGst;
    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      unitPrice: p.price,
      quantity: it.quantity,
      gstRate: p.gstRate,
      lineTotal: preGstLine,
      gstTotal: lineGst,
    };
  });

  const totalAmount = subtotal + gstAmount + shippingCost;

  const chain = await getReferralChain(session.user.id);

  // Create the local order (PENDING_PAYMENT) first, then Razorpay order, then attach IDs.
  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: session.user.id,
      status: "PENDING_PAYMENT",
      subtotal,
      gstAmount,
      shippingCost,
      totalAmount,
      shipName: shipping.fullName,
      shipPhone: shipping.phone,
      shipLine1: shipping.line1,
      shipLine2: shipping.line2 || null,
      shipCity: shipping.city,
      shipState: shipping.state,
      shipPincode: shipping.pincode,
      l1ReferrerId: chain.l1,
      l2ReferrerId: chain.l2,
      items: { create: itemSnapshots },
    },
    select: { id: true, orderNumber: true, totalAmount: true },
  });

  // Razorpay order create (amount in paise)
  let rzpOrder;
  try {
    const rzp = getRazorpay();
    rzpOrder = await rzp.orders.create({
      amount: totalAmount,
      currency: "INR",
      receipt: order.orderNumber,
      notes: { localOrderId: order.id, userId: session.user.id },
    });
  } catch (err) {
    console.error("[RZP_CREATE]", err);
    // Mark our order failed so it doesn't sit pending forever
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    return NextResponse.json(
      { error: "Payment gateway error. Check Razorpay keys." },
      { status: 500 }
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { razorpayOrderId: rzpOrder.id },
  });

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.orderNumber,
    razorpayOrderId: rzpOrder.id,
    amount: totalAmount,
    currency: "INR",
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
