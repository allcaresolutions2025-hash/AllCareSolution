import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";
import { generateUniquePinCode } from "@/lib/referral";
import { z } from "zod";

// Pro Max admin direct pin generator — mints ACTIVE Pro Max pins (proMax: true)
// for first-time onboarding, assigned to an existing Pro Max member. Mirrors
// /api/admin/pins/generate but scoped to the Pro Max programme.
const bodySchema = z.object({
  ownerReferralCode: z.string().regex(/^AM[0-9]{8}$/, "Owner Refer ID must be AM-prefixed"),
  quantity: z.number().int().min(1).max(100),
});

export async function POST(req: Request) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const owner = await prisma.user.findUnique({
    where: { referralCode: parsed.data.ownerReferralCode },
    select: { id: true, name: true, isActive: true, isProMax: true },
  });
  if (!owner) {
    return NextResponse.json({ error: "Owner Refer ID does not match any member" }, { status: 404 });
  }
  if (!owner.isProMax) {
    return NextResponse.json({ error: "Owner is not a Pro Max member" }, { status: 400 });
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
      proMax: true,
      status: "ACTIVE" as const,
    })),
  });

  return NextResponse.json({ ok: true, ownerName: owner.name, issued: codes.length, codes });
}
