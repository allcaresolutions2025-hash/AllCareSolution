import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PIN_REWARD_POINTS, PIN_REWARD_PIN_VALUE } from "@/lib/pin-reward";

// Request one 2000-pt pin reward. Entitlement = (# of 2000-pt pins the member
// obtained) − (# of reward claims not rejected). Rejected claims free up the
// entitlement again, so a member is never permanently blocked by an admin
// rejection.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const [eligiblePins, activeClaims] = await Promise.all([
    prisma.pin.count({
      where: { ownerId: session.user.id, pointsValue: PIN_REWARD_PIN_VALUE, proMax: false },
    }),
    prisma.pinReward.count({
      where: { userId: session.user.id, status: { not: "REJECTED" } },
    }),
  ]);

  if (activeClaims >= eligiblePins) {
    return NextResponse.json(
      {
        error:
          eligiblePins === 0
            ? "You need a 2000-pt pin before you can claim this reward."
            : "You have already claimed the reward for every 2000-pt pin you own.",
      },
      { status: 400 },
    );
  }

  // Re-check the entitlement inside the transaction to avoid a double-claim race.
  const claim = await prisma.$transaction(async (tx) => {
    const claimed = await tx.pinReward.count({
      where: { userId: session.user.id, status: { not: "REJECTED" } },
    });
    if (claimed >= eligiblePins) throw new Error("QUOTA");
    return tx.pinReward.create({
      data: { userId: session.user.id, pointsValue: PIN_REWARD_POINTS, status: "PENDING" },
    });
  }).catch((e) => {
    if (e instanceof Error && e.message === "QUOTA") return null;
    throw e;
  });

  if (!claim) {
    return NextResponse.json(
      { error: "You have already claimed the reward for every 2000-pt pin you own." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, claimId: claim.id });
}
