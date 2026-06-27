import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Pro Max admin grants a reward to a member directly (no request needed). The
// reward is created APPROVED and immediately shows on the member's rewards page.
const bodySchema = z.object({
  memberCode: z.string().regex(/^AM[0-9]{8}$/, "Member ID must be AM-prefixed"),
  rewardName: z.string().trim().min(2).max(120),
  note: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { memberCode, rewardName, note } = parsed.data;

  const member = await prisma.user.findUnique({
    where: { referralCode: memberCode },
    select: { id: true, isProMax: true, name: true },
  });
  if (!member) return NextResponse.json({ error: "Member ID does not match any member" }, { status: 404 });
  if (!member.isProMax) return NextResponse.json({ error: "Member is not a Pro Max member" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.proMaxReward.create({
      data: {
        userId: member.id,
        kind: "LEVEL",
        rewardName: rewardName.trim(),
        status: "APPROVED",
        adminNote: note?.trim() || null,
      },
    });
    await tx.notification.create({
      data: {
        userId: member.id,
        title: "New Pro Max reward",
        body: `You've been awarded: ${rewardName.trim()}.${note?.trim() ? ` Note: ${note.trim()}` : ""}`,
      },
    });
  });

  return NextResponse.json({ ok: true, memberName: member.name });
}
