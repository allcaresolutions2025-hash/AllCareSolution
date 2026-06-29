import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { toPaise } from "@/lib/money";
import { generateUniquePinCode } from "@/lib/referral";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ quantity: z.number().int().min(1).max(100) });

// Buy PRO MAX pins from the member's Pin Wallet points. Pins are minted ACTIVE
// immediately (proMax: true). The Pin Wallet price carries a markup over the
// offline/base price (10,800 vs 10,000), set by PIN_PRO_MAX_WALLET_PRICE_INR.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!session.user.isProMax) return NextResponse.json({ error: "Pro Max members only" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { quantity } = parsed.data;

  const [wallet, priceInr] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: session.user.id }, select: { pinWalletBalance: true } }),
    getSetting("PIN_PRO_MAX_WALLET_PRICE_INR"),
  ]);

  const pricePerPin = toPaise(priceInr);
  if (!pricePerPin || pricePerPin <= 0) {
    return NextResponse.json({ error: "Pin price not configured" }, { status: 500 });
  }
  const totalAmount = pricePerPin * quantity;

  if ((wallet?.pinWalletBalance ?? 0) < totalAmount) {
    return NextResponse.json({ error: "Not enough Pin Wallet points for this purchase." }, { status: 400 });
  }

  // Mint codes up-front; the conditional decrement guards against double-spend.
  const codes: string[] = [];
  for (let i = 0; i < quantity; i++) codes.push(await generateUniquePinCode());

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dec = await tx.wallet.updateMany({
        where: { userId: session.user.id, pinWalletBalance: { gte: totalAmount } },
        data: { pinWalletBalance: { decrement: totalAmount } },
      });
      if (dec.count === 0) throw new Error("INSUFFICIENT");

      const w = await tx.wallet.findUnique({
        where: { userId: session.user.id },
        select: { pinWalletBalance: true },
      });

      await tx.pin.createMany({
        data: codes.map((code) => ({
          code,
          ownerId: session.user.id,
          proMax: true,
          status: "ACTIVE" as const,
        })),
      });

      await tx.pinWalletTxn.create({
        data: {
          userId: session.user.id,
          type: "PIN_PURCHASE",
          amount: -totalAmount,
          balanceAfter: w?.pinWalletBalance ?? 0,
          note: `Bought ${quantity} Pro Max pin${quantity === 1 ? "" : "s"} from Pin Wallet`,
        },
      });

      return { newBalance: w?.pinWalletBalance ?? 0 };
    });

    return NextResponse.json({ ok: true, pinsIssued: codes.length, newBalance: result.newBalance });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT") {
      return NextResponse.json({ error: "Not enough Pin Wallet points for this purchase." }, { status: 400 });
    }
    throw e;
  }
}
