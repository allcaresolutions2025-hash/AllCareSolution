import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["pay", "reject"]),
  utr: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const request = await prisma.payoutRequest.findUnique({
    where: { id: params.id },
    include: { commissions: true },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "REQUESTED") {
    return NextResponse.json({ error: "Already processed" }, { status: 400 });
  }

  if (parsed.data.action === "pay") {
    if (!parsed.data.utr) return NextResponse.json({ error: "UTR required" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.payoutRequest.update({
        where: { id: request.id },
        data: { status: "PAID", utr: parsed.data.utr, processedAt: new Date() },
      });
      await tx.commission.updateMany({
        where: { payoutRequestId: request.id },
        data: { status: "PAID" },
      });
      await tx.wallet.update({
        where: { userId: request.userId },
        data: { balancePaidLifetime: { increment: request.amountNet } },
      });
      await tx.auditLog.create({
        data: {
          actorId: auth.session!.user.id,
          action: "PAYOUT_PAID",
          target: request.id,
          metadata: JSON.stringify({ utr: parsed.data.utr, amount: request.amountNet }),
        },
      });
    });
  } else {
    // Reject — return commissions back to AVAILABLE and credit wallet
    await prisma.$transaction(async (tx) => {
      await tx.commission.updateMany({
        where: { payoutRequestId: request.id },
        data: { status: "AVAILABLE", payoutRequestId: null },
      });
      await tx.wallet.update({
        where: { userId: request.userId },
        data: { balanceAvailable: { increment: request.amountGross } },
      });
      await tx.payoutRequest.update({
        where: { id: request.id },
        data: {
          status: "REJECTED",
          reviewerNotes: parsed.data.notes || null,
          processedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: auth.session!.user.id,
          action: "PAYOUT_REJECTED",
          target: request.id,
          metadata: JSON.stringify({ notes: parsed.data.notes }),
        },
      });
    });
  }

  return NextResponse.json({ ok: true });
}
