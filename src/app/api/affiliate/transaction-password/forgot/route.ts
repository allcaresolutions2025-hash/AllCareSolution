import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Member-initiated transaction-password reset request.
 * Creates a single PENDING TxnPasswordResetRequest row that admin will action.
 * Idempotent: refuses if a pending request already exists for this user.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const existing = await prisma.txnPasswordResetRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending reset request. Please wait for admin to process it." },
      { status: 409 }
    );
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true },
  });
  if (!me?.phone || !/^\d{10}$/.test(me.phone)) {
    return NextResponse.json(
      { error: "Your account does not have a valid mobile number on file. Contact support before requesting a reset." },
      { status: 400 }
    );
  }

  const req = await prisma.txnPasswordResetRequest.create({
    data: { userId: session.user.id, status: "PENDING" },
  });
  return NextResponse.json({ ok: true, id: req.id });
}
