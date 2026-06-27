import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";
import { generateUniquePinCode } from "@/lib/referral";
import { z } from "zod";

// Pro Max admin approves/rejects a Pro Max member's pin request. Approving mints
// `quantity` ACTIVE Pro Max pins to the requester. Only operates on proMax
// requests so it can never touch the 1,000-pt queue.
const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const request = await prisma.pinRequest.findUnique({ where: { id: params.id } });
  if (!request || !request.proMax) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: `Already ${request.status.toLowerCase()}` }, { status: 400 });
  }

  if (parsed.data.action === "reject") {
    await prisma.pinRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", reviewerNotes: parsed.data.notes ?? null, reviewedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

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
