import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.string().min(1),
  // `unlocked` = manual access override (bypass the leg requirement).
  // `locked`   = admin kill-switch that force-disables the Pin Wallet.
  field: z.enum(["unlocked", "locked"]),
  value: z.boolean(),
});

// Member notification per admin action, or null to skip notifying.
const NOTICE: Record<string, { title: string; body: string } | null> = {
  "unlocked:true": {
    title: "Pin Wallet unlocked",
    body: "An admin has enabled your Pin Wallet. You can now buy pins and transfer points to and from your payout wallet.",
  },
  "unlocked:false": null,
  "locked:true": {
    title: "Pin Wallet disabled",
    body: "Your Pin Wallet has been temporarily disabled by the admin. Please contact support for details.",
  },
  "locked:false": {
    title: "Pin Wallet re-enabled",
    body: "Your Pin Wallet has been re-enabled by the admin.",
  },
};

// Admin toggles a 1000-pt Pin Wallet access flag for a member. `unlocked`
// grants access despite an unfilled binary team; `locked` force-disables the
// wallet regardless of legs or the unlock override.
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { userId, field, value } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const column = field === "locked" ? "pinWalletLocked" : "pinWalletUnlocked";
  await prisma.user.update({ where: { id: userId }, data: { [column]: value } });

  const notice = NOTICE[`${field}:${value}`];
  if (notice) {
    await prisma.notification.create({ data: { userId, title: notice.title, body: notice.body } });
  }

  return NextResponse.json({ ok: true, field, value });
}
