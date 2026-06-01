import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mobileServerError } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

// Products are public; no auth required.
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        shortDesc: true,
        mrp: true,
        price: true,
        stock: true,
        imageUrl: true,
        gstRate: true,
      },
    });
    return NextResponse.json({ products });
  } catch (e) {
    return mobileServerError("products.list", e);
  }
}
