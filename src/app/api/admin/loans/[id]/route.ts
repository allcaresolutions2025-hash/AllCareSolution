import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";
import { buildInstallmentPlan, formatRupees } from "@/lib/loan";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const loan = await prisma.loan.findUnique({ where: { id: params.id } });
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (loan.status !== "REQUESTED") {
    return NextResponse.json({ error: `Already ${loan.status.toLowerCase()}` }, { status: 400 });
  }
  // A request still with its franchise leader isn't the admin's to action yet.
  if (loan.franchiseStatus === "PENDING") {
    return NextResponse.json(
      { error: "This request is awaiting approval from the member's franchise" },
      { status: 400 },
    );
  }

  if (parsed.data.action === "reject") {
    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        reviewerNotes: parsed.data.notes ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Approve: create the per-week installment schedule. The loan amount itself
  // is handed over offline — no Pin Wallet points are credited.
  const now = new Date();
  const plan = buildInstallmentPlan(loan.amount, loan.totalWeeks, now);
  const finalDue = plan[plan.length - 1]?.dueDate ?? now;

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loan.id },
      data: {
        status: "APPROVED",
        approvedAt: now,
        dueDate: finalDue,
        reviewerNotes: parsed.data.notes ?? null,
      },
    });
    await tx.loanInstallment.createMany({
      data: plan.map((p) => ({
        loanId: loan.id,
        weekNumber: p.weekNumber,
        amount: p.amount,
        dueDate: p.dueDate,
      })),
    });
    // Close the loop for the franchise leader who forwarded this request.
    if (loan.franchiseId) {
      const borrower = await tx.user.findUnique({
        where: { id: loan.userId },
        select: { name: true, referralCode: true },
      });
      await tx.notification.create({
        data: {
          userId: loan.franchiseId,
          title: "Admin approved a loan you forwarded",
          body: `The ${formatRupees(loan.amount)} loan for ${borrower?.name ?? "your member"} (${borrower?.referralCode ?? ""}) has been approved and disbursed. It now shows in your franchise portal.`,
        },
      });
    }
  });

  return NextResponse.json({ ok: true, installments: plan.length });
}
