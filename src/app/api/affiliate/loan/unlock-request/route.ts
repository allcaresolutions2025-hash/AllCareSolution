import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reason: z.string().max(500).optional(),
});

// A member blocked by the loan identity/PAN-reuse guard asks an admin to unlock
// loans for their account. One open (PENDING) request at a time.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { loanUnlocked: true },
  });
  if (me?.loanUnlocked) {
    return NextResponse.json({ error: "Your loans are already unlocked." }, { status: 400 });
  }

  const existing = await prisma.loanUnlockRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have an unlock request awaiting review." }, { status: 400 });
  }

  await prisma.loanUnlockRequest.create({
    data: { userId: session.user.id, reason: parsed.data.reason?.trim() || null },
  });

  return NextResponse.json({ ok: true });
}
