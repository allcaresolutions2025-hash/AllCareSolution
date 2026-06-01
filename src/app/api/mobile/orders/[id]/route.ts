import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const order = await prisma.order.findFirst({
      where: { id: ctx.params.id, userId: auth.user.id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        gstAmount: true,
        shippingCost: true,
        discount: true,
        totalAmount: true,
        placedAt: true,
        paidAt: true,
        shippedAt: true,
        deliveredAt: true,
        cancelledAt: true,
        trackingNumber: true,
        courier: true,
        shipName: true,
        shipPhone: true,
        shipLine1: true,
        shipLine2: true,
        shipCity: true,
        shipState: true,
        shipPincode: true,
        items: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            gstTotal: true,
            product: { select: { slug: true, imageUrl: true } },
          },
        },
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ order });
  } catch (e) {
    return mobileServerError("orders.detail", e);
  }
}
