import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";
import { buildInstallmentPlan } from "@/lib/loan";

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

  // Approve: create the per-week installment schedule.
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
  });

  return NextResponse.json({ ok: true, installments: plan.length });
}
