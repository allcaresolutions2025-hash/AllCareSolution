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

  // Approve: generate `quantity` unique AM-prefixed pins, assign to requester.
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
        proMax: request.proMax,
        status: "ACTIVE" as const,
      })),
    });
    // Approving a Pro Max pin request enrolls the requester into the Pro Max
    // program — they become a Pro Max tree root and unlock the Pro Max wallet,
    // tree graph, and the Acht Mart Combo welcome reward. Ensure a wallet row
    // exists so the points engine can credit proMaxBalanceAvailable later.
    if (request.proMax) {
      await tx.user.update({
        where: { id: request.userId },
        data: { isProMax: true },
      });
      await tx.wallet.upsert({
        where: { userId: request.userId },
        create: { userId: request.userId },
        update: {},
      });
    }
  });

  return NextResponse.json({ ok: true, pinsIssued: codes.length });
}
