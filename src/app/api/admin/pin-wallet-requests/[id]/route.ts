import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["approve", "reject", "revoke"]),
  note: z.string().max(500).optional(),
});

// Admin review of a member's payout → Pin Wallet activation request.
//  - approve → PENDING row becomes APPROVED, User.pinTopUpEnabled = true
//  - reject  → PENDING row becomes REJECTED, flag untouched (stays off)
//  - revoke  → APPROVED row becomes REVOKED, User.pinTopUpEnabled = false
// The member is notified in-app either way. Revoking leaves the row behind as
// the audit trail, and frees the member to request access again later.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { action } = parsed.data;
  const note = parsed.data.note?.trim() || null;

  const request = await prisma.pinTopUpAccessRequest.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true },
  });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  // Approve/reject act on open requests; revoke only on a granted one.
  const required = action === "revoke" ? "APPROVED" : "PENDING";
  if (request.status !== required) {
    return NextResponse.json(
      {
        error:
          action === "revoke"
            ? "Only an approved request can be revoked."
            : "This request has already been reviewed.",
      },
      { status: 400 },
    );
  }

  const now = new Date();
  const plan = {
    approve: {
      status: "APPROVED" as const,
      enabled: true,
      notice: {
        title: "Pin Wallet top-up activated",
        body: "An admin approved your request. You can now transfer points from your payout wallet into your Pin Wallet.",
      },
    },
    reject: {
      status: "REJECTED" as const,
      enabled: false,
      notice: {
        title: "Pin Wallet top-up request declined",
        body: note
          ? `Your request to transfer payout points into the Pin Wallet was declined. Reason: ${note}`
          : "Your request to transfer payout points into the Pin Wallet was declined. Please contact support for details.",
      },
    },
    revoke: {
      status: "REVOKED" as const,
      enabled: false,
      notice: {
        title: "Pin Wallet top-up access removed",
        body: note
          ? `An admin has turned off payout → Pin Wallet transfers for your account. Reason: ${note}`
          : "An admin has turned off payout → Pin Wallet transfers for your account. Please contact support for details.",
      },
    },
  }[action];

  await prisma.$transaction([
    prisma.pinTopUpAccessRequest.update({
      where: { id: request.id },
      data: {
        status: plan.status,
        adminNote: note,
        reviewerId: auth.session.user.id,
        // reviewedAt records the first decision; revoking stamps its own field
        // so both moments survive on the row.
        ...(action === "revoke" ? { revokedAt: now } : { reviewedAt: now }),
      },
    }),
    prisma.user.update({
      where: { id: request.userId },
      data: { pinTopUpEnabled: plan.enabled },
    }),
    prisma.notification.create({
      data: { userId: request.userId, title: plan.notice.title, body: plan.notice.body },
    }),
    prisma.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: `PIN_TOPUP_ACCESS_${plan.status}`,
        target: request.id,
        metadata: JSON.stringify({ userId: request.userId, note }),
      },
    }),
  ]);

  return NextResponse.json({ ok: true, status: plan.status });
}
