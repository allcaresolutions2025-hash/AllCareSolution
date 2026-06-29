import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Pro Max admin marks a single Pro Max daily payout paid / unpaid. Scoped to
// proMax rows so it can never touch the 1,000-pt payouts.
const bodySchema = z.object({ action: z.enum(["pay", "unpaid"]), notes: z.string().max(500).optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const payout = await prisma.dailyPayout.findUnique({ where: { id: params.id } });
  if (!payout || !payout.proMax) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payout.status !== "PENDING") {
    return NextResponse.json({ error: `Already ${payout.status.toLowerCase()}` }, { status: 400 });
  }

  if (parsed.data.action === "unpaid") {
    await prisma.$transaction(async (tx) => {
      await tx.dailyPayout.update({
        where: { id: payout.id },
        data: { status: "CANCELLED", reviewerNotes: parsed.data.notes ?? null },
      });
      await tx.wallet.update({
        where: { userId: payout.userId },
        data: { proMaxBalanceAvailable: { increment: payout.startBalance } },
      });
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.dailyPayout.update({
      where: { id: payout.id },
      data: { status: "PAID", paidAt: new Date(), reviewerNotes: parsed.data.notes ?? null },
    });
    await tx.wallet.update({
      where: { userId: payout.userId },
      data: { proMaxBalancePaidLifetime: { increment: payout.paidAmount } },
    });
  });

  return NextResponse.json({ ok: true });
}
