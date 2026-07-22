import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const schema = z.object({
  // Franchise leader — member ID (AM-code) or email.
  identifier: z.string().min(3).max(120),
  quantity: z.number().int().min(1).max(10000),
  note: z.string().max(500).optional(),
});

// Admin ships Welcome Kit stock to a franchise leader. Bumps both the running
// received total (never decreases) and the current shelf count, and logs the
// shipment in the ledger.
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const id = parsed.data.identifier.trim();
  const leader = await prisma.user.findFirst({
    where: { OR: [{ referralCode: id.toUpperCase() }, { email: id.toLowerCase() }] },
    select: { id: true, name: true, referralCode: true, isFranchise: true, franchiseStockCurrent: true },
  });
  if (!leader) return NextResponse.json({ error: "No member with that ID or email" }, { status: 404 });
  if (!leader.isFranchise) {
    return NextResponse.json({ error: "That member is not a franchise" }, { status: 400 });
  }

  const qty = parsed.data.quantity;
  const nextStock = leader.franchiseStockCurrent + qty;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: leader.id },
      data: {
        franchiseStockReceived: { increment: qty },
        franchiseStockCurrent: { increment: qty },
      },
    });
    await tx.franchiseStockTxn.create({
      data: {
        franchiseId: leader.id,
        type: "GRANT",
        quantity: qty,
        balanceAfter: nextStock,
        note: parsed.data.note ?? null,
        actorId: auth.session.user.id,
      },
    });
    await tx.notification.create({
      data: {
        userId: leader.id,
        title: "Welcome Kit stock received",
        body: `The admin has sent you ${qty} Welcome Kit(s). Your current stock is now ${nextStock}.`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: "FRANCHISE_STOCK_GRANTED",
        target: leader.id,
        metadata: JSON.stringify({ quantity: qty, balanceAfter: nextStock }),
      },
    });
  });

  return NextResponse.json({ ok: true, name: leader.name, referralCode: leader.referralCode, currentStock: nextStock });
}
