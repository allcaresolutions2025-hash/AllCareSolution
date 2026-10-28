import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyAdmins } from "@/lib/franchise";
import { bvForAmount, getPackageConfig } from "@/lib/package-plan";
import { pointsToPaise } from "@/lib/money";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  plan: z.enum(["STARTER", "CUSTOM"]),
  points: z.number().int().positive().max(1_000_000).optional(),
  productId: z.string().min(1, "Choose the product you want delivered"),
  shipName: z.string().trim().min(2, "Enter the receiver's name").max(100),
  shipPhone: z.string().trim().regex(/^[0-9+ ]{10,15}$/, "Enter a valid mobile number"),
  shipAddress: z.string().trim().min(10, "Enter the full delivery address").max(500),
});

// Member requests a product package. Nothing is charged here — the request
// goes to the admin, who verifies and approves it. One open (PENDING) request
// at a time.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const d = parsed.data;
  const cfg = await getPackageConfig();

  const points = d.plan === "STARTER" ? cfg.starterPoints : d.points ?? 0;
  if (points < cfg.minPoints) {
    return NextResponse.json({ error: `Minimum package is ${cfg.minPoints} points.` }, { status: 400 });
  }
  const amount = pointsToPaise(points);

  const product = await prisma.product.findUnique({
    where: { id: d.productId },
    select: { id: true, name: true, price: true, isActive: true, stock: true },
  });
  if (!product || !product.isActive) {
    return NextResponse.json({ error: "That product is not available." }, { status: 400 });
  }
  if (product.price > amount) {
    return NextResponse.json({ error: "Choose a product priced within your package points." }, { status: 400 });
  }
  if (product.stock <= 0) {
    return NextResponse.json({ error: `${product.name} is out of stock. Please choose another product.` }, { status: 400 });
  }

  const existing = await prisma.packagePurchase.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have a package request awaiting admin review." }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, referralCode: true },
  });
  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.packagePurchase.create({
      data: {
        userId: session.user.id,
        plan: d.plan,
        amount,
        bv: bvForAmount(amount, cfg.bvPercent),
        productId: product.id,
        productName: product.name,
        shipName: d.shipName,
        shipPhone: d.shipPhone,
        shipAddress: d.shipAddress,
      },
    });
    await notifyAdmins(
      tx,
      "New package request",
      `${me.name} (${me.referralCode}) requested a ${points}-pt package with ${product.name}.`,
    );
  });

  return NextResponse.json({ ok: true });
}
