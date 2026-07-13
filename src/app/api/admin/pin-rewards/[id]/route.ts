import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { pointsToPaise, formatPoints } from "@/lib/money";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

// Approve → credit the reward points to the member's PAYOUT wallet
// (Wallet.balanceAvailable), which they can then withdraw or let the daily
// payout sweep. Reject → no credit; the entitlement frees up again for the
// member to re-request.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const claim = await prisma.pinReward.findUnique({ where: { id: params.id } });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (claim.status !== "PENDING") {
    return NextResponse.json({ error: "Already processed" }, { status: 400 });
  }

  if (parsed.data.action === "reject") {
    await prisma.pinReward.update({
      where: { id: claim.id },
      data: { status: "REJECTED", adminNote: parsed.data.notes ?? null, processedAt: new Date() },
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  const amountPaise = pointsToPaise(claim.pointsValue);
  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId: claim.userId },
      create: { userId: claim.userId, balanceAvailable: amountPaise },
      update: { balanceAvailable: { increment: amountPaise } },
    });
    await tx.pinReward.update({
      where: { id: claim.id },
      data: { status: "APPROVED", adminNote: parsed.data.notes ?? null, processedAt: new Date() },
    });
    await tx.notification.create({
      data: {
        userId: claim.userId,
        title: "2000-pt pin reward credited",
        body: `Your ${formatPoints(amountPaise)} pin reward has been credited to your payout wallet. Current payout balance: ${formatPoints(wallet.balanceAvailable)}.`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: auth.session!.user.id,
        action: "PIN_REWARD_APPROVED",
        target: claim.id,
        metadata: JSON.stringify({ userId: claim.userId, points: claim.pointsValue }),
      },
    });
  });

  return NextResponse.json({ ok: true, status: "APPROVED", credited: claim.pointsValue });
}
