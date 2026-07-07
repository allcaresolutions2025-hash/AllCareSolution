import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});

// Admin reviews a member's loan-unlock request. Approving sets
// User.loanUnlocked = true (the identity/PAN guards then bypass that member);
// rejecting just records the decision.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const request = await prisma.loanUnlockRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: `Already ${request.status.toLowerCase()}` }, { status: 400 });
  }

  const approve = parsed.data.action === "approve";

  await prisma.$transaction(async (tx) => {
    await tx.loanUnlockRequest.update({
      where: { id: request.id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        adminNote: parsed.data.note ?? null,
        reviewedAt: new Date(),
      },
    });
    if (approve) {
      await tx.user.update({ where: { id: request.userId }, data: { loanUnlocked: true } });
      await tx.notification.create({
        data: {
          userId: request.userId,
          title: "Loans unlocked",
          body: "An admin has unlocked loans for your account. You can now apply for a loan from your Achieved Offers page.",
        },
      });
    } else {
      await tx.notification.create({
        data: {
          userId: request.userId,
          title: "Loan unlock request declined",
          body: parsed.data.note
            ? `Your loan unlock request was declined: ${parsed.data.note}`
            : "Your loan unlock request was declined by the admin.",
        },
      });
    }
  });

  return NextResponse.json({ ok: true, action: parsed.data.action });
}
