import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mobileServerError } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: { slug: string } }) {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: ctx.params.slug, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        shortDesc: true,
        description: true,
        ingredients: true,
        mrp: true,
        price: true,
        stock: true,
        imageUrl: true,
        gallery: true,
        gstRate: true,
      },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (e) {
    return mobileServerError("products.detail", e);
  }
}
