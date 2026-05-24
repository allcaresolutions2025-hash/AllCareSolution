import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addressSchema } from "@/lib/validation";
import { getReferralChain } from "@/lib/referral";
import { getAllBusinessSettings } from "@/lib/settings";
import { generateOrderNumber } from "@/lib/utils";
import { toPaise } from "@/lib/money";
import { accrueCommissionsForOrder } from "@/lib/commission";
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
  const orderNumber = generateOrderNumber();

  // COD: create order as PAID, decrement stock, accrue commissions in one transaction.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: session.user.id,
        status: "PAID",
        paidAt: new Date(),
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
      select: { id: true, orderNumber: true },
    });
    for (const it of itemSnapshots) {
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { decrement: it.quantity } },
      });
    }
    await accrueCommissionsForOrder(created.id, tx);
    return created;
  });

  return NextResponse.json({ ok: true, orderId: order.id, orderNumber: order.orderNumber });
}
