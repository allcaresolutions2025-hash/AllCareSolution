import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { approvePackagePurchase, rejectPackagePurchase, PackageError } from "@/lib/package-plan";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["approve", "reject", "ship", "deliver"]),
  note: z.string().max(500).optional(),
  trackingNumber: z.string().max(100).optional(),
});

// Admin review of a package request.
//  - approve → activates the package points and pushes BV up the tree
//  - reject  → declines the request
//  - ship / deliver → product fulfilment on an APPROVED package
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { action } = parsed.data;
  const note = parsed.data.note?.trim() || null;
  const reviewerId = auth.session.user.id;

  try {
    if (action === "approve") {
      const result = await approvePackagePurchase(params.id, reviewerId, note);
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "reject") {
      await rejectPackagePurchase(params.id, reviewerId, note);
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    if (e instanceof PackageError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }

  // Fulfilment: PENDING → SHIPPED → DELIVERED, only once approved.
  const from = action === "ship" ? "PENDING" : "SHIPPED";
  const now = new Date();
  const updated = await prisma.packagePurchase.updateMany({
    where: { id: params.id, status: "APPROVED", deliveryStatus: from },
    data:
      action === "ship"
        ? { deliveryStatus: "SHIPPED", shippedAt: now, trackingNumber: parsed.data.trackingNumber?.trim() || null }
        : { deliveryStatus: "DELIVERED", deliveredAt: now },
  });
  if (updated.count === 0) {
    return NextResponse.json(
      { error: action === "ship" ? "Only an approved, unshipped package can be shipped." : "Only a shipped package can be marked delivered." },
      { status: 400 },
    );
  }

  const purchase = await prisma.packagePurchase.findUnique({
    where: { id: params.id },
    select: { userId: true, productName: true, trackingNumber: true },
  });
  if (purchase) {
    await prisma.notification.create({
      data: {
        userId: purchase.userId,
        title: action === "ship" ? "Package product shipped" : "Package product delivered",
        body:
          action === "ship"
            ? `${purchase.productName} is on its way${purchase.trackingNumber ? ` (tracking: ${purchase.trackingNumber})` : ""}.`
            : `${purchase.productName} has been marked delivered.`,
      },
    });
  }
  await prisma.auditLog.create({
    data: {
      actorId: reviewerId,
      action: action === "ship" ? "PACKAGE_SHIPPED" : "PACKAGE_DELIVERED",
      target: params.id,
    },
  });

  return NextResponse.json({ ok: true });
}
