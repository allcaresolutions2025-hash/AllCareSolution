import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.string().min(1),
  unlocked: z.boolean(),
});

// Admin toggles the 1000-pt Pin Wallet access override for a member. When
// `unlocked` is true the member can use the Pin Wallet even without meeting the
// both-legs-filled requirement; setting it false returns them to the normal
// leg-based rule.
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { userId, unlocked } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.user.update({ where: { id: userId }, data: { pinWalletUnlocked: unlocked } });

  if (unlocked) {
    await prisma.notification.create({
      data: {
        userId,
        title: "Pin Wallet unlocked",
        body: "An admin has enabled your Pin Wallet. You can now buy pins and transfer points to and from your payout wallet.",
      },
    });
  }

  return NextResponse.json({ ok: true, unlocked });
}
