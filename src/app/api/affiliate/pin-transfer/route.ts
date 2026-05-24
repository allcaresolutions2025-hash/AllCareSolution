import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const bodySchema = z.object({
  pinCodes: z.array(z.string().regex(/^AM[0-9]{8}$/)).min(1).max(100),
  recipientCode: z.string().regex(/^AM[0-9]{8}$/),
  transactionPassword: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { pinCodes, recipientCode, transactionPassword } = parsed.data;

  // 1. Verify transaction password.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { transactionPasswordHash: true, referralCode: true },
  });
  if (!me?.transactionPasswordHash) {
    return NextResponse.json(
      { error: "Set a transaction password in Settings before transferring pins" },
      { status: 400 }
    );
  }
  const okPassword = await bcrypt.compare(transactionPassword, me.transactionPasswordHash);
  if (!okPassword) {
    return NextResponse.json({ error: "Incorrect transaction password" }, { status: 400 });
  }
  if (recipientCode === me.referralCode) {
    return NextResponse.json({ error: "Cannot transfer pins to yourself" }, { status: 400 });
  }

  // 2. Resolve recipient and verify they are in caller's downline.
  const recipient = await prisma.user.findUnique({
    where: { referralCode: recipientCode },
    select: { id: true, referrerId: true, isActive: true },
  });
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }
  if (!recipient.isActive) {
    return NextResponse.json({ error: "Recipient account is inactive" }, { status: 400 });
  }
  // Walk up: recipient must have caller in their ancestor chain.
  let cursor: string | null = recipient.referrerId;
  let inDownline = false;
  let safety = 0;
  while (cursor && safety++ < 100) {
    if (cursor === session.user.id) {
      inDownline = true;
      break;
    }
    const next = await prisma.user.findUnique({
      where: { id: cursor },
      select: { referrerId: true },
    });
    cursor = next?.referrerId ?? null;
  }
  if (!inDownline) {
    return NextResponse.json({ error: "Recipient is not in your downline" }, { status: 403 });
  }

  // 3. Verify each pin belongs to caller and is ACTIVE.
  const pins = await prisma.pin.findMany({
    where: { code: { in: pinCodes } },
    select: { id: true, code: true, ownerId: true, status: true },
  });
  if (pins.length !== pinCodes.length) {
    return NextResponse.json({ error: "One or more pins not found" }, { status: 400 });
  }
  for (const p of pins) {
    if (p.ownerId !== session.user.id || p.status !== "ACTIVE") {
      return NextResponse.json({ error: `Pin ${p.code} is not available to transfer` }, { status: 400 });
    }
  }

  // 4. Re-owner the pins.
  await prisma.pin.updateMany({
    where: { id: { in: pins.map((p) => p.id) } },
    data: { ownerId: recipient.id },
  });

  return NextResponse.json({ ok: true, transferred: pins.length });
}
