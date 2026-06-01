import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// Records that the admin has reminded the borrower about an unpaid installment.
// The actual outreach is done by the admin (e.g. via the WhatsApp deep-link the
// UI opens); this endpoint just stamps lastReminderAt and writes an AuditLog so
// reminders can be tracked across sessions.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const inst = await prisma.loanInstallment.findUnique({
    where: { id: params.id },
    select: { id: true, loanId: true, weekNumber: true, status: true, loan: { select: { userId: true, status: true } } },
  });
  if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (inst.loan.status !== "APPROVED") {
    return NextResponse.json({ error: "Loan is not active" }, { status: 400 });
  }
  if (inst.status === "VERIFIED") {
    return NextResponse.json({ error: "Already paid" }, { status: 400 });
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.loanInstallment.update({
      where: { id: inst.id },
      data: { lastReminderAt: now },
    }),
    prisma.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: "LOAN_REMINDER_SENT",
        target: inst.id,
        metadata: JSON.stringify({
          loanId: inst.loanId,
          borrowerId: inst.loan.userId,
          weekNumber: inst.weekNumber,
        }),
      },
    }),
  ]);

  return NextResponse.json({ ok: true, lastReminderAt: now.toISOString() });
}
