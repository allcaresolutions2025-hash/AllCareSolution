import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { formatRupees, loanWalletChargePaise } from "@/lib/loan";
import { z } from "zod";

const bodySchema = z.object({
  action: z.enum(["verify", "reject"]),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const inst = await prisma.loanInstallment.findUnique({
    where: { id: params.id },
    include: { loan: { select: { id: true, status: true, userId: true } } },
  });
  if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (inst.loan.status !== "APPROVED") {
    return NextResponse.json({ error: "Loan is not active" }, { status: 400 });
  }
  if (inst.status !== "RECEIPT_UPLOADED") {
    return NextResponse.json({ error: "Nothing to review" }, { status: 400 });
  }

  if (parsed.data.action === "reject") {
    const reason = parsed.data.notes?.trim() ||
      (inst.paidViaWallet
        ? "Pin Wallet payment rejected — points refunded."
        : "Receipt not valid — please upload a proper receipt.");
    await prisma.$transaction(async (tx) => {
      await tx.loanInstallment.update({
        where: { id: inst.id },
        data: {
          status: "PENDING",
          paidViaWallet: false,
          reviewerNotes: reason,
          receiptBase64: null,
          receiptMime: null,
          uploadedAt: null,
        },
      });

      if (inst.paidViaWallet) {
        // Refund the held points (installment + 10%) back to the Pin Wallet.
        const refund = loanWalletChargePaise(inst.amount);
        const wallet = await tx.wallet.upsert({
          where: { userId: inst.loan.userId },
          create: { userId: inst.loan.userId, pinWalletBalance: refund },
          update: { pinWalletBalance: { increment: refund } },
          select: { pinWalletBalance: true },
        });
        await tx.pinWalletTxn.create({
          data: {
            userId: inst.loan.userId,
            type: "LOAN_REPAYMENT",
            amount: refund,
            balanceAfter: wallet.pinWalletBalance,
            note: `Week ${inst.weekNumber} loan repayment refunded — admin rejected (${formatRupees(refund)})`,
          },
        });
        await tx.notification.create({
          data: {
            userId: inst.loan.userId,
            title: "Pin Wallet payment rejected",
            body: `Your Week ${inst.weekNumber} Pin Wallet payment was rejected and ${formatRupees(refund)} points were refunded. ${reason}`,
          },
        });
      } else {
        await tx.notification.create({
          data: {
            userId: inst.loan.userId,
            title: "Receipt rejected",
            body: `Your Week ${inst.weekNumber} payment receipt was rejected. ${reason} Please upload a proper receipt from My Loan.`,
          },
        });
      }
    });
    return NextResponse.json({ ok: true });
  }

  // Verify. If this was the final outstanding installment, close the loan.
  await prisma.$transaction(async (tx) => {
    await tx.loanInstallment.update({
      where: { id: inst.id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        reviewerNotes: parsed.data.notes ?? null,
      },
    });

    const unfinished = await tx.loanInstallment.count({
      where: { loanId: inst.loan.id, status: { not: "VERIFIED" } },
    });
    if (unfinished === 0) {
      await tx.loan.update({
        where: { id: inst.loan.id },
        data: { status: "CLOSED", closedAt: new Date() },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
