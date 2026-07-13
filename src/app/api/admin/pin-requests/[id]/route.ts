import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { generateUniquePinCode } from "@/lib/referral";
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

  // A Pro Max request means one of two things, decided by whether the requester
  // is already Pro Max:
  //   - NOT Pro Max yet → "request to become Pro Max": flip them to Pro Max so
  //     they can start building their Pro Max tree. No pins minted.
  //   - Already Pro Max → "request Pro Max pins": mint `quantity` Pro Max pins
  //     they use to register new Pro Max members.
  if (request.proMax) {
    const member = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { isProMax: true },
    });

    if (member?.isProMax) {
      // Pin request from an existing Pro Max member — mint pins.
      const codes: string[] = [];
      for (let i = 0; i < request.quantity; i++) codes.push(await generateUniquePinCode());
      await prisma.$transaction(async (tx) => {
        await tx.pinRequest.update({
          where: { id: request.id },
          data: { status: "APPROVED", reviewerNotes: parsed.data.notes ?? null, reviewedAt: new Date() },
        });
        await tx.pin.createMany({
          data: codes.map((code) => ({
            code,
            ownerId: request.userId,
            requestId: request.id,
            proMax: true,
            status: "ACTIVE" as const,
          })),
        });
      });
      return NextResponse.json({ ok: true, pinsIssued: codes.length });
    }

    // Become-Pro-Max request — just flip the flag (no pins, no cascade). Pro Max
    // earnings come from building the Pro Max tree (registering Pro Max members).
    await prisma.$transaction(async (tx) => {
      await tx.pinRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", reviewerNotes: parsed.data.notes ?? null, reviewedAt: new Date() },
      });
      await tx.wallet.upsert({
        where: { userId: request.userId },
        create: { userId: request.userId },
        update: {},
      });
      await tx.user.update({ where: { id: request.userId }, data: { isProMax: true } });
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
        pointsValue: request.pointsValue,
        status: "ACTIVE" as const,
      })),
    });
  });

  return NextResponse.json({ ok: true, pinsIssued: codes.length });
}
