import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  REWARD_LEVELS,
  rewardThresholdMet,
  rewardMembersPerSide,
  WELCOME_KIT_LEVEL,
  WELCOME_KIT_REWARD,
} from "@/lib/rewards";
import { getLegFillDepths } from "@/lib/network";
import { z } from "zod";

// level 0    = Welcome Kit (joining gift, no leg-count gate)
// level 1-15 = the reward ladder; each level is INDEPENDENTLY claimable once
//              the per-leg threshold is met
const schema = z.object({ level: z.number().int().min(0).max(15) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid level" }, { status: 400 });

  const { level } = parsed.data;

  // Block duplicate claims at this level first (clearer 409 than the generic
  // sequential-claim error).
  const existing = await prisma.rewardClaim.findUnique({
    where: { userId_level: { userId: session.user.id, level } },
  });
  if (existing) {
    return NextResponse.json({ error: "You have already submitted a claim for this level" }, { status: 409 });
  }

  // Welcome Kit — every joined user can claim it once; no leg-count check, no
  // sequential ordering against L1-L15.
  if (level === WELCOME_KIT_LEVEL) {
    const claim = await prisma.rewardClaim.create({
      data: {
        userId: session.user.id,
        level: WELCOME_KIT_LEVEL,
        rewardName: WELCOME_KIT_REWARD.gift,
      },
    });
    return NextResponse.json({ ok: true, claimId: claim.id });
  }

  const reward = REWARD_LEVELS.find((r) => r.level === level);
  if (!reward) return NextResponse.json({ error: "Unknown reward level" }, { status: 400 });

  const [user, fillDepths] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leftLegCount: true, rightLegCount: true },
    }),
    getLegFillDepths(session.user.id),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (
    !rewardThresholdMet(reward, {
      leftLegCount: user.leftLegCount,
      rightLegCount: user.rightLegCount,
      leftFillDepth: fillDepths.leftFillDepth,
      rightFillDepth: fillDepths.rightFillDepth,
    })
  ) {
    return NextResponse.json(
      {
        error: `This reward needs both legs completely filled to level ${reward.level} (${rewardMembersPerSide(reward.level)} members on each side, no empty slots). Fill your weaker leg to unlock.`,
      },
      { status: 403 },
    );
  }

  const claim = await prisma.rewardClaim.create({
    data: {
      userId: session.user.id,
      level,
      rewardName: reward.gift,
    },
  });

  return NextResponse.json({ ok: true, claimId: claim.id });
}
