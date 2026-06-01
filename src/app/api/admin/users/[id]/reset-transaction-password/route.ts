import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import bcrypt from "bcryptjs";

/**
 * Admin resets the member's transaction password back to their mobile number.
 * Sets `mustChangeTransactionPassword: true` so the member is forced to pick a
 * new one on their next visit to Settings (banner shown on dashboard).
 *
 * Requires the user to have a phone number on file (10 digits).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, phone: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.phone || !/^\d{10}$/.test(user.phone)) {
    return NextResponse.json(
      { error: "User does not have a valid 10-digit mobile number on file. Add a mobile in Edit User first." },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(user.phone, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      transactionPasswordHash: hash,
      mustChangeTransactionPassword: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: auth.session.user.id,
      action: "TXN_PASSWORD_RESET",
      target: user.id,
      metadata: JSON.stringify({ userEmail: user.email, mobileMasked: `XXXXXX${user.phone.slice(-4)}` }),
    },
  });

  return NextResponse.json({
    ok: true,
    message: `Transaction password reset. Member can sign in to Settings and use their mobile (${user.phone}) as the current transaction password to set a new one.`,
  });
}
