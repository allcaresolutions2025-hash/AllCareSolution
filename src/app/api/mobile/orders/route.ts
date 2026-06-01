import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const orders = await prisma.order.findMany({
      where: { userId: auth.user.id },
      orderBy: { placedAt: "desc" },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        placedAt: true,
        items: {
          select: { name: true, quantity: true, unitPrice: true },
        },
      },
    });
    return NextResponse.json({ orders });
  } catch (e) {
    return mobileServerError("orders.list", e);
  }
}
