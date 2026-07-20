import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireFranchise, notifyAdmins } from "@/lib/franchise";
import { formatRupees } from "@/lib/loan";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

// Franchise leader vets a downline loan request. Approving only moves it into
// the admin's queue — the admin still does the real approval, builds the
// repayment schedule and disburses. Rejecting stops it here.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireFranchise();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const loan = await prisma.loan.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true, referralCode: true } } },
  });
  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the owning franchise may act, and only while it is still theirs.
  if (loan.franchiseId !== auth.leaderId) {
    return NextResponse.json({ error: "This request is not assigned to you" }, { status: 403 });
  }
  if (loan.franchiseStatus !== "PENDING" || loan.status !== "REQUESTED") {
    return NextResponse.json({ error: "This request has already been actioned" }, { status: 400 });
  }

  const now = new Date();

  if (parsed.data.action === "reject") {
    await prisma.$transaction(async (tx) => {
      await tx.loan.update({
        where: { id: loan.id },
        data: {
          franchiseStatus: "REJECTED",
          franchiseReviewedAt: now,
          franchiseNotes: parsed.data.notes ?? null,
          status: "REJECTED",
          rejectedAt: now,
          reviewerNotes: "Rejected by franchise",
        },
      });
      await tx.notification.create({
        data: {
          userId: loan.userId,
          title: "Loan request rejected",
          body: `Your ${formatRupees(loan.amount)} loan request was rejected by your franchise. Contact them for details.`,
        },
      });
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.loan.update({
      where: { id: loan.id },
      data: {
        franchiseStatus: "APPROVED",
        franchiseReviewedAt: now,
        franchiseNotes: parsed.data.notes ?? null,
      },
    });
    await tx.notification.create({
      data: {
        userId: loan.userId,
        title: "Loan approved by your franchise",
        body: `Your ${formatRupees(loan.amount)} loan request has been verified by your franchise and sent to the admin for final approval.`,
      },
    });
    await notifyAdmins(
      tx,
      "Franchise forwarded a loan request",
      `${auth.session.user.name} (franchise) approved a ${formatRupees(loan.amount)} loan request for ${loan.user.name} (${loan.user.referralCode}). Awaiting your approval.`,
    );
  });

  return NextResponse.json({ ok: true });
}
