import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { rewardPinWalletPoints } from "@/lib/rewards";
import { pointsToPaise, formatPoints } from "@/lib/money";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "DISPATCHED", "DELIVERED", "REJECTED"]),
  adminNote: z.string().max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const claim = await prisma.rewardClaim.findUnique({ where: { id: params.id } });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  // L1-15 rewards pay points into the member's Pin Wallet on approval. Credit
  // once, the first time the claim flips to APPROVED. The note carries the claim
  // id so re-approving (e.g. APPROVED→DISPATCHED→APPROVED) can't double-credit.
  const points = rewardPinWalletPoints(claim.level);
  const shouldCredit =
    parsed.data.status === "APPROVED" && claim.status !== "APPROVED" && points > 0;

  if (shouldCredit) {
    const creditNote = `reward:${claim.id}`;
    const already = await prisma.pinWalletTxn.findFirst({
      where: { userId: claim.userId, note: { contains: creditNote } },
      select: { id: true },
    });
    if (!already) {
      const amountPaise = pointsToPaise(points);
      await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId: claim.userId },
          create: { userId: claim.userId, pinWalletBalance: amountPaise },
          update: { pinWalletBalance: { increment: amountPaise } },
        });
        await tx.pinWalletTxn.create({
          data: {
            userId: claim.userId,
            type: "ADMIN_CREDIT",
            amount: amountPaise,
            balanceAfter: wallet.pinWalletBalance,
            note: `Level ${claim.level} reward (${creditNote})`,
          },
        });
        await tx.notification.create({
          data: {
            userId: claim.userId,
            title: "Reward credited to Pin Wallet",
            body: `Your Level ${claim.level} reward of ${formatPoints(amountPaise)} has been added to your Pin Wallet. Use it to buy pins.`,
          },
        });
        await tx.rewardClaim.update({
          where: { id: claim.id },
          data: { status: parsed.data.status, adminNote: parsed.data.adminNote ?? null },
        });
      });
      return NextResponse.json({ ok: true, status: parsed.data.status, credited: points });
    }
  }

  const updated = await prisma.rewardClaim.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      adminNote: parsed.data.adminNote ?? null,
    },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
