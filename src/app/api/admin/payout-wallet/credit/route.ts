import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { pointsToPaise, formatPoints } from "@/lib/money";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.string().min(1),
  points: z.number().positive().max(10_000_000),
  note: z.string().max(300).optional(),
});

// Admin adds points to a member's payout wallet (Wallet.balanceAvailable) —
// the same balance the points engine credits, so it's picked up by the nightly
// 90/10 payout and withdrawals. There's no ledger for this balance, so the
// credit is recorded in AuditLog and the member is notified in-app.
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { userId, points } = parsed.data;
  const note = parsed.data.note?.trim() || undefined;
  const amountPaise = pointsToPaise(points);
  if (amountPaise <= 0) return NextResponse.json({ error: "Enter a positive amount" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newBalance = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      create: { userId, balanceAvailable: amountPaise },
      update: { balanceAvailable: { increment: amountPaise } },
    });
    await tx.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: "PAYOUT_WALLET_ADMIN_CREDIT",
        target: userId,
        metadata: JSON.stringify({ amountPaise, balanceAfter: wallet.balanceAvailable, note }),
      },
    });
    await tx.notification.create({
      data: {
        userId,
        title: "Payout wallet credited",
        body: `Admin added ${formatPoints(amountPaise)} to your payout wallet.${note ? ` Note: ${note}` : ""}`,
      },
    });
    return wallet.balanceAvailable;
  });

  return NextResponse.json({ ok: true, newBalance });
}
