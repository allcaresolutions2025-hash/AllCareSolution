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

// Admin adds points to an AF account's AF wallet (PackageAccount.walletBalance)
// — the balance package earnings land in, which the account moves to its
// e-wallet to withdraw. Logged as an ADMIN_CREDIT in the PackageEarning ledger;
// it is not income, so it neither counts toward earnedLifetime nor uses up the
// payout ceiling (which only counts DIRECT + BINARY).
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

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAf: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.isAf) return NextResponse.json({ error: "Not an AF account" }, { status: 400 });

  const newBalance = await prisma.$transaction(async (tx) => {
    const account = await tx.packageAccount.upsert({
      where: { userId },
      create: { userId, walletBalance: amountPaise },
      update: { walletBalance: { increment: amountPaise } },
    });
    await tx.packageEarning.create({
      data: {
        userId,
        type: "ADMIN_CREDIT",
        amount: amountPaise,
        grossAmount: amountPaise,
        note: note ?? "Added by admin",
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: "AF_WALLET_ADMIN_CREDIT",
        target: userId,
        metadata: JSON.stringify({ amountPaise, balanceAfter: account.walletBalance, note }),
      },
    });
    await tx.notification.create({
      data: {
        userId,
        title: "AF wallet credited",
        body: `Admin added ${formatPoints(amountPaise)} to your AF wallet.${note ? ` Note: ${note}` : ""}`,
      },
    });
    return account.walletBalance;
  });

  return NextResponse.json({ ok: true, newBalance });
}
