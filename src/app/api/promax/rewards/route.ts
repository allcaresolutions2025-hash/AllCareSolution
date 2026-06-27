import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  PROMAX_REWARD_LEVELS,
  PROMAX_WELCOME_KIT_LEVEL,
  PROMAX_WELCOME_KIT_REWARD,
  proMaxRewardThresholdMet,
  proMaxRewardMembersPerSide,
} from "@/lib/rewards-promax";
import { getProMaxLegFillDepths } from "@/lib/network-promax";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Pro Max member claims a reward level.
//   level 0    = Welcome Kit (joining gift, no leg gate)
//   level 1-15 = the ladder; each claimable once both Pro Max legs are filled to
//                that depth. One claim per member+level.
const schema = z.object({ level: z.number().int().min(0).max(15) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!session.user.isProMax) return NextResponse.json({ error: "Pro Max members only" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid level" }, { status: 400 });
  const { level } = parsed.data;

  const existing = await prisma.proMaxReward.findUnique({
    where: { userId_level: { userId: session.user.id, level } },
  });
  if (existing) {
    return NextResponse.json({ error: "You have already claimed this level" }, { status: 409 });
  }

  // Welcome Kit — no leg requirement.
  if (level === PROMAX_WELCOME_KIT_LEVEL) {
    const claim = await prisma.proMaxReward.create({
      data: { userId: session.user.id, level, rewardName: PROMAX_WELCOME_KIT_REWARD.gift },
    });
    return NextResponse.json({ ok: true, claimId: claim.id });
  }

  const reward = PROMAX_REWARD_LEVELS.find((r) => r.level === level);
  if (!reward) return NextResponse.json({ error: "Unknown reward level" }, { status: 400 });

  const fillDepths = await getProMaxLegFillDepths(session.user.id);
  if (!proMaxRewardThresholdMet(reward, fillDepths)) {
    return NextResponse.json(
      {
        error: `This reward needs both Pro Max legs completely filled to level ${reward.level} (${proMaxRewardMembersPerSide(reward.level)} members on each side, no empty slots).`,
      },
      { status: 403 },
    );
  }

  const claim = await prisma.proMaxReward.create({
    data: { userId: session.user.id, level, rewardName: reward.gift },
  });
  return NextResponse.json({ ok: true, claimId: claim.id });
}
