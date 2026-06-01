import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const request = await prisma.txnPasswordResetRequest.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, phone: true, email: true } } },
  });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Request already processed" }, { status: 400 });
  }

  if (parsed.data.action === "reject") {
    await prisma.txnPasswordResetRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        reviewerId: auth.session.user.id,
        reviewerNotes: parsed.data.notes || null,
        reviewedAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: "TXN_PASSWORD_RESET_REJECTED",
        target: request.id,
        metadata: JSON.stringify({ userId: request.userId, notes: parsed.data.notes }),
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Approve: reset to mobile + flip must-change flag (mirrors the standalone
  // admin reset endpoint, but also resolves the pending request row).
  if (!request.user.phone || !/^\d{10}$/.test(request.user.phone)) {
    return NextResponse.json(
      { error: "User does not have a valid 10-digit mobile on file. Edit the user, add a mobile, then approve." },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(request.user.phone, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: request.userId },
      data: { transactionPasswordHash: hash, mustChangeTransactionPassword: true },
    }),
    prisma.txnPasswordResetRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        reviewerId: auth.session.user.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: "TXN_PASSWORD_RESET_APPROVED",
        target: request.id,
        metadata: JSON.stringify({
          userId: request.userId,
          userEmail: request.user.email,
          mobileMasked: `XXXXXX${request.user.phone.slice(-4)}`,
        }),
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    message: `Approved. Member's transaction password is now their mobile (${request.user.phone}).`,
  });
}
