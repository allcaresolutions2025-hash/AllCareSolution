import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyAdmins } from "@/lib/franchise";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
});

// A member asks an admin to activate payout wallet -> Pin Wallet transfers for
// their account. One open (PENDING) request at a time; members who already have
// access don't need to ask again.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, referralCode: true, pinTopUpEnabled: true },
  });
  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (me.pinTopUpEnabled) {
    return NextResponse.json(
      { error: "Payout → Pin Wallet transfer is already active on your account." },
      { status: 400 },
    );
  }

  const existing = await prisma.pinTopUpAccessRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have an activation request awaiting review." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.pinTopUpAccessRequest.create({
      data: { userId: session.user.id, reason: parsed.data.reason?.trim() || null },
    });
    await notifyAdmins(
      tx,
      "Pin Wallet top-up request",
      `${me.name} (${me.referralCode}) asked to activate payout → Pin Wallet transfers.`,
    );
  });

  return NextResponse.json({ ok: true });
}
