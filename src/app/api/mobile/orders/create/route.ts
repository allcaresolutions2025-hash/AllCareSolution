import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";
import { addressSchema } from "@/lib/validation";
import { getReferralChain } from "@/lib/referral";
import { getAllBusinessSettings } from "@/lib/settings";
import { generateOrderNumber } from "@/lib/utils";
import { toPaise } from "@/lib/money";
import { accrueCommissionsForOrder } from "@/lib/commission";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  shipping: addressSchema,
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive().max(50),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { shipping, items } = parsed.data;

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, isActive: true },
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
    const chain = await getReferralChain(auth.user.id);
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: auth.user.id,
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
        select: { id: true, orderNumber: true, totalAmount: true },
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

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalPaise: order.totalAmount,
    });
  } catch (e) {
    return mobileServerError("orders.create", e);
  }
}
