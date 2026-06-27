import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Pro Max member requests the main reward — the ACHT MART Pro Max Combo Box.
// Creates a PENDING COMBO reward for admin approval. One per member.
const COMBO_NAME = "ACHT MART Pro Max Combo Box";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!session.user.isProMax) return NextResponse.json({ error: "Pro Max members only" }, { status: 403 });

  const existing = await prisma.proMaxReward.findFirst({
    where: { userId: session.user.id, kind: "COMBO" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "You have already requested the Combo Box." }, { status: 400 });
  }

  const reward = await prisma.proMaxReward.create({
    data: {
      userId: session.user.id,
      kind: "COMBO",
      rewardName: COMBO_NAME,
      status: "PENDING",
    },
  });
  return NextResponse.json({ ok: true, id: reward.id });
}
