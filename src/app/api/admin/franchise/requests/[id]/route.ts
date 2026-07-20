import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNote: z.string().max(500).optional(),
});

// Admin reviews a member's franchise request. Approving flips User.isFranchise,
// which immediately opens the /franchise portal for them — the flag is read from
// the DB on every request, so they don't need to sign in again.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const request = await prisma.franchiseRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: `Already ${request.status.toLowerCase()}` }, { status: 400 });
  }

  const now = new Date();
  const approve = parsed.data.action === "approve";

  await prisma.$transaction(async (tx) => {
    await tx.franchiseRequest.update({
      where: { id: request.id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        adminNote: parsed.data.adminNote ?? null,
        reviewedAt: now,
      },
    });
    if (approve) {
      await tx.user.update({
        where: { id: request.userId },
        data: { isFranchise: true, franchiseGrantedAt: now },
      });
    }
    await tx.notification.create({
      data: {
        userId: request.userId,
        title: approve ? "Franchise approved" : "Franchise request declined",
        body: approve
          ? "You are now a franchise. Open 'Login into Franchise' from your dashboard to manage your team's loans and Welcome Kits."
          : `Your franchise request was not approved.${parsed.data.adminNote ? ` ${parsed.data.adminNote}` : ""}`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: approve ? "FRANCHISE_GRANTED" : "FRANCHISE_REQUEST_REJECTED",
        target: request.userId,
        metadata: JSON.stringify({ requestId: request.id }),
      },
    });
  });

  return NextResponse.json({ ok: true });
}
