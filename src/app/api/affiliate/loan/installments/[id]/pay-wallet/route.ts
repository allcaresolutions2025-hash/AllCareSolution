import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupees, loanWalletChargePaise } from "@/lib/loan";

export const dynamic = "force-dynamic";

// Pay a loan installment using Pin Wallet points. Cost = installment + 10%
// surcharge only — NO overdue penalty is charged. The points are held (deducted)
// immediately and the installment moves to the admin verification queue
// (status RECEIPT_UPLOADED, paidViaWallet). Admin approve finalises it; reject
// refunds the points. The loan closes only when its final installment is
// approved.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const inst = await prisma.loanInstallment.findUnique({
    where: { id: params.id },
    include: { loan: { select: { id: true, userId: true, status: true, amount: true } } },
  });
  if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (inst.loan.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (inst.loan.status !== "APPROVED") return NextResponse.json({ error: "Loan is not active" }, { status: 400 });
  if (inst.status === "VERIFIED") return NextResponse.json({ error: "This installment is already paid" }, { status: 400 });
  if (inst.status === "RECEIPT_UPLOADED") return NextResponse.json({ error: "This week is already submitted and awaiting admin approval" }, { status: 400 });

  // Installment + 10% surcharge only — no overdue penalty.
  const total = loanWalletChargePaise(inst.amount);

  const wallet = await prisma.wallet.findUnique({
    where: { userId: session.user.id },
    select: { pinWalletBalance: true },
  });
  if ((wallet?.pinWalletBalance ?? 0) < total) {
    return NextResponse.json(
      { error: `Not enough Pin Wallet points. This installment needs ${formatRupees(total)} (incl. 10%).` },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Guard against double-spend / concurrent pay: conditional decrement.
      const dec = await tx.wallet.updateMany({
        where: { userId: session.user.id, pinWalletBalance: { gte: total } },
        data: { pinWalletBalance: { decrement: total } },
      });
      if (dec.count === 0) throw new Error("INSUFFICIENT");

      const w = await tx.wallet.findUnique({
        where: { userId: session.user.id },
        select: { pinWalletBalance: true },
      });

      // Move to the admin verification queue (same place as uploaded receipts),
      // flagged as a Pin Wallet payment. NOT verified yet.
      await tx.loanInstallment.update({
        where: { id: inst.id },
        data: {
          status: "RECEIPT_UPLOADED",
          paidViaWallet: true,
          uploadedAt: new Date(),
          penaltyPaise: 0,
          reviewerNotes: null,
          // No receipt file for a wallet payment.
          receiptBase64: null,
          receiptMime: null,
        },
      });

      await tx.pinWalletTxn.create({
        data: {
          userId: session.user.id,
          type: "LOAN_REPAYMENT",
          amount: -total,
          balanceAfter: w?.pinWalletBalance ?? 0,
          note: `Week ${inst.weekNumber} loan repayment via Pin Wallet (${formatRupees(total)}) — awaiting approval`,
        },
      });

      return { newBalance: w?.pinWalletBalance ?? 0 };
    });

    return NextResponse.json({ ok: true, paid: total, ...result });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT") {
      return NextResponse.json({ error: "Not enough Pin Wallet points." }, { status: 400 });
    }
    throw e;
  }
}
