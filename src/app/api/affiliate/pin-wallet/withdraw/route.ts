import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPinWallet, PIN_WALLET_LOCKED_MESSAGE } from "@/lib/pin-wallet-access";
import { MIN_WITHDRAW_POINTS, MIN_WITHDRAW_POINTS_BIG_LOAN, BIG_LOAN_THRESHOLD_PAISE } from "@/lib/loan";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Points are whole rupees (1 point = ₹1 = 100 paise). Moving points the other
// way — Pin Wallet back into the payout (e-wallet) balance — has a floor that
// depends on the member's loan history; it is enforced once we know it below.
const bodySchema = z.object({
  points: z.number().int().positive(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // Pin Wallet is locked until both binary legs are filled.
  if (!(await canAccessPinWallet(session.user.id))) {
    return NextResponse.json({ error: PIN_WALLET_LOCKED_MESSAGE }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  // Members who have taken a loan of Rs. 5,000 or more (the Special Loan or any
  // higher-ladder loan) must transfer at least 6,000 points at a time; everyone
  // else keeps the standard 3,000-point floor. Below the floor they can still
  // spend Pin Wallet points on pins — they just can't move them to payout.
  const bigLoan = await prisma.loan.findFirst({
    where: {
      userId: session.user.id,
      proMax: false,
      status: { in: ["APPROVED", "CLOSED"] },
      amount: { gte: BIG_LOAN_THRESHOLD_PAISE },
    },
    select: { id: true },
  });
  const minPoints = bigLoan ? MIN_WITHDRAW_POINTS_BIG_LOAN : MIN_WITHDRAW_POINTS;
  if (parsed.data.points < minPoints) {
    return NextResponse.json(
      { error: `Minimum transfer to your payout wallet is ${minPoints.toLocaleString("en-IN")} points.` },
      { status: 400 },
    );
  }

  const amountPaise = parsed.data.points * 100;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Conditional debit guards against withdrawing more than the Pin Wallet holds.
      const dec = await tx.wallet.updateMany({
        where: { userId: session.user.id, pinWalletBalance: { gte: amountPaise } },
        data: {
          pinWalletBalance: { decrement: amountPaise },
          balanceAvailable: { increment: amountPaise },
        },
      });
      if (dec.count === 0) throw new Error("INSUFFICIENT");

      const w = await tx.wallet.findUnique({
        where: { userId: session.user.id },
        select: { balanceAvailable: true, pinWalletBalance: true },
      });

      // Recorded on the Pin Wallet ledger as a negative PAYOUT_TRANSFER (points
      // leaving the pin wallet toward the payout balance).
      await tx.pinWalletTxn.create({
        data: {
          userId: session.user.id,
          type: "PAYOUT_TRANSFER",
          amount: -amountPaise,
          balanceAfter: w?.pinWalletBalance ?? 0,
          note: "Transferred to payout wallet",
        },
      });

      return {
        payoutBalance: w?.balanceAvailable ?? 0,
        pinWalletBalance: w?.pinWalletBalance ?? 0,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT") {
      return NextResponse.json(
        { error: "Not enough Pin Wallet points to transfer." },
        { status: 400 },
      );
    }
    throw e;
  }
}
