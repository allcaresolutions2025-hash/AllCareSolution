import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { generateUniquePinCode } from "@/lib/referral";
import { awardProMaxOnUpgrade } from "@/lib/points-promax";
import { z } from "zod";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const request = await prisma.pinRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: `Already ${request.status.toLowerCase()}` }, { status: 400 });
  }

  if (parsed.data.action === "reject") {
    await prisma.pinRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        reviewerNotes: parsed.data.notes ?? null,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  // A Pro Max request is a "request to BECOME Pro Max" — approving it flips the
  // member to Pro Max in place (cascade fires up the main tree). No pins are
  // minted here; once Pro Max, the member issues their own pins instantly and
  // upgrades downlines without admin approval.
  if (request.proMax) {
    await prisma.$transaction(async (tx) => {
      await tx.pinRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", reviewerNotes: parsed.data.notes ?? null, reviewedAt: new Date() },
      });
      const member = await tx.user.findUnique({
        where: { id: request.userId },
        select: { isProMax: true },
      });
      await tx.wallet.upsert({
        where: { userId: request.userId },
        create: { userId: request.userId },
        update: {},
      });
      if (!member?.isProMax) {
        await tx.user.update({ where: { id: request.userId }, data: { isProMax: true } });
        await awardProMaxOnUpgrade(tx, request.userId);
      }
    });
    return NextResponse.json({ ok: true, proMaxApproved: true });
  }

  // Standard pin request: generate `quantity` unique AM-prefixed pins.
  const codes: string[] = [];
  for (let i = 0; i < request.quantity; i++) {
    codes.push(await generateUniquePinCode());
  }

  await prisma.$transaction(async (tx) => {
    await tx.pinRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        reviewerNotes: parsed.data.notes ?? null,
        reviewedAt: new Date(),
      },
    });
    await tx.pin.createMany({
      data: codes.map((code) => ({
        code,
        ownerId: request.userId,
        requestId: request.id,
        status: "ACTIVE" as const,
      })),
    });
  });

  return NextResponse.json({ ok: true, pinsIssued: codes.length });
}
