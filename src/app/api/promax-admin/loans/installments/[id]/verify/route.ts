import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Pro Max admin verifies (or rejects) a member's uploaded repayment receipt.
// Mirror of the 1,000-pt verify route, scoped to Pro Max loans.
const bodySchema = z.object({
  action: z.enum(["verify", "reject"]),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const inst = await prisma.loanInstallment.findUnique({
    where: { id: params.id },
    include: { loan: { select: { id: true, status: true, proMax: true } } },
  });
  if (!inst || !inst.loan.proMax) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (inst.loan.status !== "APPROVED") return NextResponse.json({ error: "Loan is not active" }, { status: 400 });
  if (inst.status !== "RECEIPT_UPLOADED") return NextResponse.json({ error: "No receipt to review" }, { status: 400 });

  if (parsed.data.action === "reject") {
    await prisma.loanInstallment.update({
      where: { id: inst.id },
      data: { status: "PENDING", reviewerNotes: parsed.data.notes ?? null },
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.loanInstallment.update({
      where: { id: inst.id },
      data: { status: "VERIFIED", verifiedAt: new Date(), reviewerNotes: parsed.data.notes ?? null },
    });
    const unfinished = await tx.loanInstallment.count({
      where: { loanId: inst.loan.id, status: { not: "VERIFIED" } },
    });
    if (unfinished === 0) {
      await tx.loan.update({ where: { id: inst.loan.id }, data: { status: "CLOSED", closedAt: new Date() } });
    }
  });

  return NextResponse.json({ ok: true });
}
