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
  PROMAX_COMBO_LEVEL,
  PROMAX_COMBO_REWARD,
  FORTY_COMBO_LEVEL,
  FORTY_COMBO_REWARD,
} from "@/lib/rewards";
import { PIN_REWARD_PIN_VALUE } from "@/lib/pin-reward";
import { franchiseRoutingFor } from "@/lib/franchise";
import { getLegFillDepths } from "@/lib/network";
import { z } from "zod";

// level 0    = Welcome Kit (joining gift, no leg-count gate)
// level 1-15 = the reward ladder; each level is INDEPENDENTLY claimable once
//              the per-leg threshold is met
// level 40   = 40 Combo Reward (members enrolled with a 2000-pt pin only)
// level 100  = Pin Pro Max "Acht Mart Combo" (Pro Max members only)
const schema = z.object({
  level: z.union([
    z.number().int().min(0).max(15),
    z.literal(FORTY_COMBO_LEVEL),
    z.literal(PROMAX_COMBO_LEVEL),
  ]),
});

// A member is a "2000-pt member" if the pin used to enrol them was a 2000-pt pin.
async function wasEnrolledWith2000Pin(userId: string): Promise<boolean> {
  const pin = await prisma.pin.findFirst({
    where: { usedForUserId: userId, pointsValue: { gte: PIN_REWARD_PIN_VALUE } },
    select: { id: true },
  });
  return Boolean(pin);
}

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

  // Pin Pro Max combo — claimable once by Pro Max members; no leg-count gate.
  if (level === PROMAX_COMBO_LEVEL) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isProMax: true },
    });
    if (!user?.isProMax) {
      return NextResponse.json({ error: "Only Pro Max members can claim this reward" }, { status: 403 });
    }
    const claim = await prisma.rewardClaim.create({
      data: {
        userId: session.user.id,
        level: PROMAX_COMBO_LEVEL,
        rewardName: PROMAX_COMBO_REWARD.gift,
      },
    });
    return NextResponse.json({ ok: true, claimId: claim.id });
  }

  // 40 Combo Reward — only for members enrolled with a 2000-pt pin. Physical
  // reward fulfilled by admin; no leg-count gate, one claim per member.
  if (level === FORTY_COMBO_LEVEL) {
    if (!(await wasEnrolledWith2000Pin(session.user.id))) {
      return NextResponse.json(
        { error: "The 40 Combo Reward is only for members enrolled with a 2000-pt pin." },
        { status: 403 },
      );
    }
    const claim = await prisma.rewardClaim.create({
      data: {
        userId: session.user.id,
        level: FORTY_COMBO_LEVEL,
        rewardName: FORTY_COMBO_REWARD.gift,
      },
    });
    return NextResponse.json({ ok: true, claimId: claim.id });
  }

  // Welcome Kit — every joined user can claim it once; no leg-count check, no
  // sequential ordering against L1-L15. EXCEPT 2000-pt members, who receive the
  // 40 Combo Reward instead of the Welcome Kit.
  if (level === WELCOME_KIT_LEVEL) {
    if (await wasEnrolledWith2000Pin(session.user.id)) {
      return NextResponse.json(
        { error: "As a 2000-pt member you receive the 40 Combo Reward instead of the Welcome Kit." },
        { status: 403 },
      );
    }
    // The Welcome Kit is the one reward a franchise handles: if this member sits
    // under a franchise leader, the claim goes to them to approve and deliver
    // instead of onto the admin's dispatch queue.
    const routing = await franchiseRoutingFor(session.user.id);
    const claim = await prisma.rewardClaim.create({
      data: {
        userId: session.user.id,
        level: WELCOME_KIT_LEVEL,
        rewardName: WELCOME_KIT_REWARD.gift,
        ...routing,
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
