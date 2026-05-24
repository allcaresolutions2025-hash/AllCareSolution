import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { generateUniquePinCode } from "@/lib/referral";
import { z } from "zod";

// Admin-only direct pin generator. Use this to mint pins for first-time
// onboarding — i.e. before any member has requested pins via the regular
// PinRequest flow. The pins are created ACTIVE and assigned to whichever
// member-owner the admin specifies.
//
// Body:
//   ownerReferralCode  AM-prefixed code of the user who will own the pins
//   quantity           1..100
//   notes              optional free text

const bodySchema = z.object({
  ownerReferralCode: z.string().regex(/^AM[0-9]{8}$/, "Owner Refer ID must be AM-prefixed"),
  quantity: z.number().int().min(1).max(100),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const owner = await prisma.user.findUnique({
    where: { referralCode: parsed.data.ownerReferralCode },
    select: { id: true, name: true, isActive: true },
  });
  if (!owner) {
    return NextResponse.json({ error: "Owner Refer ID does not match any member" }, { status: 404 });
  }
  if (!owner.isActive) {
    return NextResponse.json({ error: "Owner account is inactive" }, { status: 400 });
  }

  const codes: string[] = [];
  for (let i = 0; i < parsed.data.quantity; i++) {
    codes.push(await generateUniquePinCode());
  }

  await prisma.pin.createMany({
    data: codes.map((code) => ({
      code,
      ownerId: owner.id,
      status: "ACTIVE" as const,
    })),
  });

  return NextResponse.json({
    ok: true,
    ownerName: owner.name,
    issued: codes.length,
    codes,
  });
}
