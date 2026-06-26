import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { awardProMaxOnUpgrade } from "@/lib/points-promax";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  pinCode: z.string().regex(/^AM[0-9]{8}$/, "Invalid pin format"),
  referId: z.string().regex(/^AM[0-9]{8}$/, "Refer ID must be AM-prefixed"),
});

// A Pro Max member applies one of their Pro Max pins to an existing downline
// member in their MAIN tree — that member becomes Pro Max instantly (no admin
// approval), and Pro Max value cascades up the main tree.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { pinCode, referId } = parsed.data;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isProMax: true },
  });
  if (!me?.isProMax) {
    return NextResponse.json({ error: "Only Pro Max members can upgrade downlines" }, { status: 403 });
  }

  // Pin must belong to caller, be ACTIVE and Pro Max.
  const pin = await prisma.pin.findUnique({ where: { code: pinCode } });
  if (!pin || pin.ownerId !== session.user.id || pin.status !== "ACTIVE" || !pin.proMax) {
    return NextResponse.json({ error: "Pro Max pin not found or already used" }, { status: 400 });
  }

  // Target must exist, not already Pro Max, and sit in the caller's main downline.
  const target = await prisma.user.findUnique({
    where: { referralCode: referId },
    select: { id: true, isProMax: true, referrerId: true, name: true },
  });
  if (!target) return NextResponse.json({ error: "Member ID not found" }, { status: 400 });
  if (target.id === session.user.id) {
    return NextResponse.json({ error: "You are already Pro Max" }, { status: 400 });
  }
  if (target.isProMax) {
    return NextResponse.json({ error: "That member is already Pro Max" }, { status: 400 });
  }
  // Walk up the main tree from the target to confirm it's in the caller's downline.
  let cursor: string | null = target.referrerId;
  let allowed = false;
  let safety = 0;
  while (cursor && safety++ < 200) {
    if (cursor === session.user.id) { allowed = true; break; }
    const next = await prisma.user.findUnique({ where: { id: cursor }, select: { referrerId: true } });
    cursor = next?.referrerId ?? null;
  }
  if (!allowed) {
    return NextResponse.json({ error: "That member is not in your downline" }, { status: 403 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Consume the pin (guard against a double-spend race).
      const used = await tx.pin.updateMany({
        where: { id: pin.id, status: "ACTIVE" },
        data: { status: "USED", usedAt: new Date(), usedForUserId: target.id },
      });
      if (used.count === 0) throw new Error("PIN_CONSUMED");

      await tx.user.update({ where: { id: target.id }, data: { isProMax: true } });
      await tx.wallet.upsert({
        where: { userId: target.id },
        create: { userId: target.id },
        update: {},
      });
      await awardProMaxOnUpgrade(tx, target.id);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "PIN_CONSUMED") {
      return NextResponse.json({ error: "That pin was just used. Try another." }, { status: 400 });
    }
    console.error("[PROMAX_UPGRADE]", e);
    return NextResponse.json({ error: "Could not upgrade member. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, name: target.name });
}
