import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupees, loanWalletSurcharge, loanWalletChargePaise } from "@/lib/loan";

export const dynamic = "force-dynamic";

// Pay a loan installment using Pin Wallet points. Cost = installment + 9%
// surcharge only — NO overdue penalty is charged. On success the installment is
// marked paid (VERIFIED) immediately — no receipt/admin review needed — and the
// loan is closed once its final installment clears.
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

  // Installment + 9% surcharge only — no overdue penalty.
  const surcharge = loanWalletSurcharge(inst.amount);
  const total = loanWalletChargePaise(inst.amount);

  const wallet = await prisma.wallet.findUnique({
    where: { userId: session.user.id },
    select: { pinWalletBalance: true },
  });
  if ((wallet?.pinWalletBalance ?? 0) < total) {
    return NextResponse.json(
      { error: `Not enough Pin Wallet points. This installment needs ${formatRupees(total)} (incl. 9%).` },
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

      await tx.loanInstallment.update({
        where: { id: inst.id },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          penaltyPaise: 0,
          reviewerNotes: `Paid via Pin Wallet — ${formatRupees(inst.amount)} + 9% (${formatRupees(surcharge)}) = ${formatRupees(total)}`,
          // Clear any rejected/old receipt artefacts.
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
          note: `Week ${inst.weekNumber} loan repayment via Pin Wallet (${formatRupees(total)})`,
        },
      });

      // Close the loan when every installment is verified.
      const unfinished = await tx.loanInstallment.count({
        where: { loanId: inst.loan.id, status: { not: "VERIFIED" } },
      });
      if (unfinished === 0) {
        await tx.loan.update({ where: { id: inst.loan.id }, data: { status: "CLOSED", closedAt: new Date() } });
      }
      return { newBalance: w?.pinWalletBalance ?? 0, closed: unfinished === 0 };
    });

    return NextResponse.json({ ok: true, paid: total, ...result });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT") {
      return NextResponse.json({ error: "Not enough Pin Wallet points." }, { status: 400 });
    }
    throw e;
  }
}
