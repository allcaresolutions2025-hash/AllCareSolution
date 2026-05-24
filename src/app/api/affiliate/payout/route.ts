import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toPaise } from "@/lib/money";
import { computeTdsForPayout } from "@/lib/commission";
import { z } from "zod";

const bodySchema = z.object({ amount: z.number().positive() });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const amountPaise = toPaise(parsed.data.amount);

  const [kyc, wallet] = await Promise.all([
    prisma.kycDetail.findUnique({ where: { userId: session.user.id } }),
    prisma.wallet.findUnique({ where: { userId: session.user.id } }),
  ]);

  if (!kyc || kyc.status !== "APPROVED") {
    return NextResponse.json({ error: "KYC not approved yet" }, { status: 400 });
  }
  if (!wallet || wallet.balanceAvailable < amountPaise) {
    return NextResponse.json({ error: "Insufficient available balance" }, { status: 400 });
  }

  // Pick AVAILABLE commissions FIFO until we cover the requested amount.
  const eligible = await prisma.commission.findMany({
    where: { beneficiaryId: session.user.id, status: "AVAILABLE" },
    orderBy: { availableAt: "asc" },
  });

  const picked: typeof eligible = [];
  let total = 0;
  for (const c of eligible) {
    if (total >= amountPaise) break;
    picked.push(c);
    total += c.commissionAmount;
  }
  if (total < amountPaise) {
    return NextResponse.json({ error: "Insufficient eligible commissions" }, { status: 400 });
  }

  // For simplicity we payout exactly the sum of selected commissions (not split mid-commission).
  const grossPaise = total;
  const tds = await computeTdsForPayout(session.user.id, grossPaise);
  const bankSnap = JSON.stringify({
    bankAccount: kyc.bankAccount,
    ifsc: kyc.ifsc,
    bankHolderName: kyc.bankHolderName,
    panNumber: kyc.panNumber,
  });

  await prisma.$transaction(async (tx) => {
    const request = await tx.payoutRequest.create({
      data: {
        userId: session.user.id,
        amountGross: grossPaise,
        tdsRate: tds.tdsRate,
        tdsAmount: tds.tdsAmount,
        amountNet: tds.amountNet,
        status: "REQUESTED",
        bankSnapshot: bankSnap,
      },
    });
    await tx.commission.updateMany({
      where: { id: { in: picked.map((p) => p.id) } },
      data: { status: "REQUESTED", payoutRequestId: request.id },
    });
    await tx.wallet.update({
      where: { userId: session.user.id },
      data: { balanceAvailable: { decrement: grossPaise } },
    });
  });

  return NextResponse.json({ ok: true, gross: grossPaise, tds: tds.tdsAmount, net: tds.amountNet });
}
