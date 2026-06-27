import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";
import { proMaxRewardPinWalletPoints } from "@/lib/rewards-promax";
import { pointsToPaise, formatPoints } from "@/lib/money";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Pro Max admin moves a reward claim along: approve → dispatch → deliver, or
// reject. Levels 1-6 credit Pin Wallet points the first time they're APPROVED
// (deduped by a note tag so re-approving can't double-credit).
const bodySchema = z.object({
  status: z.enum(["APPROVED", "DISPATCHED", "DELIVERED", "REJECTED"]),
  note: z.string().max(300).optional(),
});

const STATUS_MESSAGE: Record<string, string> = {
  APPROVED: "approved",
  DISPATCHED: "dispatched",
  DELIVERED: "delivered",
  REJECTED: "rejected",
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const reward = await prisma.proMaxReward.findUnique({ where: { id: params.id } });
  if (!reward) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Pin Wallet credit on first approval (levels 1-6 only).
  const points = proMaxRewardPinWalletPoints(reward.level);
  const shouldCredit = parsed.data.status === "APPROVED" && reward.status !== "APPROVED" && points > 0;
  const creditTag = `promax-reward:${reward.id}`;

  await prisma.$transaction(async (tx) => {
    await tx.proMaxReward.update({
      where: { id: reward.id },
      data: { status: parsed.data.status, adminNote: parsed.data.note?.trim() || reward.adminNote },
    });

    if (shouldCredit) {
      const already = await tx.pinWalletTxn.findFirst({
        where: { userId: reward.userId, note: { contains: creditTag } },
        select: { id: true },
      });
      if (!already) {
        const amountPaise = pointsToPaise(points);
        const wallet = await tx.wallet.upsert({
          where: { userId: reward.userId },
          create: { userId: reward.userId, pinWalletBalance: amountPaise },
          update: { pinWalletBalance: { increment: amountPaise } },
        });
        await tx.pinWalletTxn.create({
          data: {
            userId: reward.userId,
            type: "ADMIN_CREDIT",
            amount: amountPaise,
            balanceAfter: wallet.pinWalletBalance,
            note: `Level ${reward.level} reward (${creditTag})`,
          },
        });
        await tx.notification.create({
          data: {
            userId: reward.userId,
            title: "Reward credited to Pin Wallet",
            body: `Your Level ${reward.level} reward of ${formatPoints(amountPaise)} has been added to your Pin Wallet.`,
          },
        });
        return;
      }
    }

    await tx.notification.create({
      data: {
        userId: reward.userId,
        title: "Reward update",
        body: `Your reward "${reward.rewardName}" was ${STATUS_MESSAGE[parsed.data.status]}.${parsed.data.note?.trim() ? ` Note: ${parsed.data.note.trim()}` : ""}`,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
