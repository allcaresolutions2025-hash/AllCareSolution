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
  // How the member pays. COD keeps the legacy pay-on-delivery flow; WALLET_POINTS
  // debits the payout wallet (balanceAvailable) up-front for the full total.
  paymentMethod: z.enum(["COD", "WALLET_POINTS"]).default("COD"),
});

const INSUFFICIENT_WALLET_MESSAGE =
  "Insufficient payout wallet balance to pay for this order.";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { shipping, items, paymentMethod } = parsed.data;

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

  // Both payment methods create the order as PAID, decrement stock and accrue
  // commissions in one transaction. WALLET_POINTS additionally debits the payout
  // wallet (balanceAvailable) up-front — the whole thing rolls back on failure.
  let insufficientWallet = false;
  const order = await prisma.$transaction(async (tx) => {
    if (paymentMethod === "WALLET_POINTS") {
      // Read the wallet inside the transaction, then debit only if it covers the
      // full total. Prisma's updateMany with a balance guard makes the debit
      // atomic — count === 0 means another concurrent spend beat us to it.
      const debited = await tx.wallet.updateMany({
        where: { userId: session.user.id, balanceAvailable: { gte: totalAmount } },
        data: { balanceAvailable: { decrement: totalAmount } },
      });
      if (debited.count === 0) {
        insufficientWallet = true;
        throw new Error("INSUFFICIENT_WALLET");
      }
    }
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: session.user.id,
        status: "PAID",
        paymentMethod,
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
  }).catch((err) => {
    if (insufficientWallet) return null;
    throw err;
  });

  if (!order) {
    return NextResponse.json({ error: INSUFFICIENT_WALLET_MESSAGE }, { status: 400 });
  }

  return NextResponse.json({ ok: true, orderId: order.id, orderNumber: order.orderNumber });
}
