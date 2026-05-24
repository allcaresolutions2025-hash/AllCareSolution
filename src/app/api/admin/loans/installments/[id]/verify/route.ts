import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
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
    include: { loan: { select: { id: true, status: true } } },
  });
  if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (inst.loan.status !== "APPROVED") {
    return NextResponse.json({ error: "Loan is not active" }, { status: 400 });
  }
  if (inst.status !== "RECEIPT_UPLOADED") {
    return NextResponse.json({ error: "No receipt to review" }, { status: 400 });
  }

  if (parsed.data.action === "reject") {
    await prisma.loanInstallment.update({
      where: { id: inst.id },
      data: {
        status: "PENDING",
        reviewerNotes: parsed.data.notes ?? null,
        // Keep the receipt around so the user can see what was rejected
        // and re-upload over the top.
      },
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
