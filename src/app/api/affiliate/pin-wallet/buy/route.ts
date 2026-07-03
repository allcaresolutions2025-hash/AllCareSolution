import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { toPaise } from "@/lib/money";
import { generateUniquePinCode } from "@/lib/referral";
import { canAccessPinWallet, PIN_WALLET_LOCKED_MESSAGE } from "@/lib/pin-wallet-access";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  quantity: z.number().int().min(1).max(100),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, "Mobile must be 10 digits").optional(),
});

// Buy pins directly from the member's Pin Wallet points. No admin approval —
// pins are minted ACTIVE immediately, the same way the Razorpay flow mints them.
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
  const { quantity } = parsed.data;

  const [user, wallet, pinWalletPriceInr] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } }),
    prisma.wallet.findUnique({ where: { userId: session.user.id }, select: { pinWalletBalance: true } }),
    getSetting("PIN_WALLET_PRICE_INR"),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const mobileNumber = parsed.data.mobileNumber ?? user.phone ?? "";
  if (!/^[0-9]{10}$/.test(mobileNumber)) {
    return NextResponse.json({ error: "A valid 10-digit mobile number is required" }, { status: 400 });
  }

  const pricePerPin = toPaise(pinWalletPriceInr);
  if (!pricePerPin || pricePerPin <= 0) {
    return NextResponse.json({ error: "Pin price not configured" }, { status: 500 });
  }
  const totalAmount = pricePerPin * quantity;

  const balance = wallet?.pinWalletBalance ?? 0;
  if (balance < totalAmount) {
    return NextResponse.json(
      { error: "Not enough Pin Wallet points. Top up from your payout wallet and try again." },
      { status: 400 },
    );
  }

  // Mint unique codes up-front (each does its own uniqueness check), then write
  // everything in one transaction. The conditional decrement guards against a
  // double-spend race: if the balance dropped below the total since we read it,
  // updateMany affects 0 rows and we abort.
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

      const purchase = await tx.pinPurchase.create({
        data: {
          userId: session.user.id,
          quantity,
          mobileNumber,
          pricePerPin,
          totalAmount,
          status: "PAID",
          source: "PIN_WALLET",
          paidAt: new Date(),
        },
      });

      await tx.pin.createMany({
        data: codes.map((code) => ({
          code,
          ownerId: session.user.id,
          purchaseId: purchase.id,
          status: "ACTIVE" as const,
        })),
      });

      await tx.pinWalletTxn.create({
        data: {
          userId: session.user.id,
          type: "PIN_PURCHASE",
          amount: -totalAmount,
          balanceAfter: w?.pinWalletBalance ?? 0,
          note: `Bought ${quantity} pin${quantity === 1 ? "" : "s"} from Pin Wallet`,
        },
      });

      return { newBalance: w?.pinWalletBalance ?? 0 };
    });

    return NextResponse.json({ ok: true, pinsIssued: codes.length, newBalance: result.newBalance });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT") {
      return NextResponse.json(
        { error: "Not enough Pin Wallet points. Top up from your payout wallet and try again." },
        { status: 400 },
      );
    }
    throw e;
  }
}
