import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPinWallet, PIN_WALLET_LOCKED_MESSAGE } from "@/lib/pin-wallet-access";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Points are whole rupees (1 point = ₹1 = 100 paise) everywhere in the app.
const MIN_TRANSFER_POINTS = 200;
const bodySchema = z.object({
  points: z.number().int().min(MIN_TRANSFER_POINTS, `Minimum transfer is ${MIN_TRANSFER_POINTS} points`),
});

// Move points from the member's payout (e-wallet) balance into their Pin Wallet
// so they can buy more pins.
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
  const amountPaise = parsed.data.points * 100;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Conditional debit guards against transferring more than is available
      // (and against a concurrent payout draining the balance).
      const dec = await tx.wallet.updateMany({
        where: { userId: session.user.id, balanceAvailable: { gte: amountPaise } },
        data: {
          balanceAvailable: { decrement: amountPaise },
          pinWalletBalance: { increment: amountPaise },
        },
      });
      if (dec.count === 0) throw new Error("INSUFFICIENT");

      const w = await tx.wallet.findUnique({
        where: { userId: session.user.id },
        select: { balanceAvailable: true, pinWalletBalance: true },
      });

      await tx.pinWalletTxn.create({
        data: {
          userId: session.user.id,
          type: "PAYOUT_TRANSFER",
          amount: amountPaise,
          balanceAfter: w?.pinWalletBalance ?? 0,
          note: "Transferred from payout wallet",
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
        { error: "Not enough payout points to transfer." },
        { status: 400 },
      );
    }
    throw e;
  }
}
