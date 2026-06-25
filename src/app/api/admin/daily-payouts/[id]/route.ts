import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const bodySchema = z.object({
  action: z.enum(["pay", "unpaid"]),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const payout = await prisma.dailyPayout.findUnique({ where: { id: params.id } });
  if (!payout) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payout.status !== "PENDING") {
    return NextResponse.json({ error: `Already ${payout.status.toLowerCase()}` }, { status: 400 });
  }

  if (parsed.data.action === "unpaid") {
    // Reverse the payout: restore the user's balance to what it was before the
    // nightly run (incrementing rather than setting, so any points earned in
    // the meantime are preserved). Pro Max rows restore the Pro Max wallet.
    await prisma.$transaction(async (tx) => {
      await tx.dailyPayout.update({
        where: { id: payout.id },
        data: { status: "CANCELLED", reviewerNotes: parsed.data.notes ?? null },
      });
      await tx.wallet.update({
        where: { userId: payout.userId },
        data: payout.proMax
          ? { proMaxBalanceAvailable: { increment: payout.startBalance } }
          : { balanceAvailable: { increment: payout.startBalance } },
      });
    });
    return NextResponse.json({ ok: true });
  }

  // Mark paid: roll the paidAmount into the matching lifetime-paid total.
  await prisma.$transaction(async (tx) => {
    await tx.dailyPayout.update({
      where: { id: payout.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        reviewerNotes: parsed.data.notes ?? null,
      },
    });
    await tx.wallet.update({
      where: { userId: payout.userId },
      data: payout.proMax
        ? { proMaxBalancePaidLifetime: { increment: payout.paidAmount } }
        : { balancePaidLifetime: { increment: payout.paidAmount } },
    });
  });

  return NextResponse.json({ ok: true });
}
