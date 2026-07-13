import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pointsToPaise, PAISE_PER_POINT } from "@/lib/money";
import { z } from "zod";

// Manual points withdrawal — a member asks admin to cash out their earning
// (e-wallet / balanceAvailable) points. Unlike the nightly daily payout, this
// is on-demand and pays 1:1 with no forfeit. The points are HELD immediately at
// request time (balanceAvailable is decremented) so the nightly sweep can't pay
// them a second time; admin then disburses offline and marks the request paid
// from the admin Payouts page. A rejected request refunds the held points.

// Minimum balance (in displayed points) a member must withdraw at once.
const MIN_WITHDRAW_POINTS = 500;
const MIN_WITHDRAW_PAISE = MIN_WITHDRAW_POINTS * PAISE_PER_POINT;

const bodySchema = z.object({ points: z.number().int().positive() });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const amountPaise = pointsToPaise(parsed.data.points);
  if (amountPaise < MIN_WITHDRAW_PAISE) {
    return NextResponse.json(
      { error: `Minimum withdrawal is ${MIN_WITHDRAW_POINTS} pts.` },
      { status: 400 },
    );
  }

  const [user, kyc, wallet, pending] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        bankAccountName: true,
        bankAccountNumber: true,
        bankIfsc: true,
        panNumber: true,
      },
    }),
    prisma.kycDetail.findUnique({ where: { userId: session.user.id } }),
    prisma.wallet.findUnique({ where: { userId: session.user.id } }),
    prisma.payoutRequest.findFirst({
      where: { userId: session.user.id, status: "REQUESTED" },
      select: { id: true },
    }),
  ]);

  if (pending) {
    return NextResponse.json(
      { error: "You already have a withdrawal request pending admin approval." },
      { status: 400 },
    );
  }

  // Bank details are needed for admin to pay offline. Prefer KYC (verified)
  // details, fall back to the registration bank fields on the user.
  const bankAccount = kyc?.bankAccount || user?.bankAccountNumber || null;
  const ifsc = kyc?.ifsc || user?.bankIfsc || null;
  const bankHolderName = kyc?.bankHolderName || user?.bankAccountName || null;
  const panNumber = kyc?.panNumber || user?.panNumber || null;
  if (!bankAccount || !ifsc) {
    return NextResponse.json(
      { error: "Add your bank account details in KYC before requesting a withdrawal." },
      { status: 400 },
    );
  }

  if (!wallet || wallet.balanceAvailable < amountPaise) {
    return NextResponse.json({ error: "Insufficient points balance." }, { status: 400 });
  }

  const bankSnapshot = JSON.stringify({ bankAccount, ifsc, bankHolderName, panNumber });

  // Hold the points and open the request atomically. The where-guard on
  // balanceAvailable makes the decrement fail-safe against a concurrent spend.
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.updateMany({
        where: { userId: session.user.id, balanceAvailable: { gte: amountPaise } },
        data: { balanceAvailable: { decrement: amountPaise } },
      });
      if (updated.count === 0) throw new Error("INSUFFICIENT");
      await tx.payoutRequest.create({
        data: {
          userId: session.user.id,
          amountGross: amountPaise,
          tdsRate: 0,
          tdsAmount: 0,
          amountNet: amountPaise, // 1:1, no forfeit
          status: "REQUESTED",
          bankSnapshot,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT") {
      return NextResponse.json({ error: "Insufficient points balance." }, { status: 400 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, points: parsed.data.points });
}
