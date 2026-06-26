import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateUniquePinCode } from "@/lib/referral";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ quantity: z.number().int().min(1).max(100) });

// Pro Max members issue their own Pro Max pins INSTANTLY (no admin approval).
// They then apply each pin to a downline to upgrade that member to Pro Max
// (see /api/members/pro-max/upgrade).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isProMax: true },
  });
  if (!me?.isProMax) {
    return NextResponse.json({ error: "Only Pro Max members can issue Pro Max pins" }, { status: 403 });
  }

  const { quantity } = parsed.data;
  const codes: string[] = [];
  for (let i = 0; i < quantity; i++) codes.push(await generateUniquePinCode());

  await prisma.pin.createMany({
    data: codes.map((code) => ({
      code,
      ownerId: session.user.id,
      proMax: true,
      status: "ACTIVE" as const,
    })),
  });

  return NextResponse.json({ ok: true, pinsIssued: codes.length });
}
