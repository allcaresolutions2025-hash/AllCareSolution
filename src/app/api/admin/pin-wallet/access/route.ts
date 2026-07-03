import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["enable", "disable"]),
});

// A single enable/disable toggle for a member's 1000-pt Pin Wallet:
//  - enable  → grant access (set the unlock override, clear any admin lock)
//  - disable → force-lock the wallet regardless of legs or the override
const ACTIONS: Record<
  "enable" | "disable",
  { data: { pinWalletUnlocked: boolean; pinWalletLocked: boolean }; notice: { title: string; body: string } }
> = {
  enable: {
    data: { pinWalletUnlocked: true, pinWalletLocked: false },
    notice: {
      title: "Pin Wallet enabled",
      body: "An admin has enabled your Pin Wallet. You can now buy pins and transfer points to and from your payout wallet.",
    },
  },
  disable: {
    data: { pinWalletUnlocked: false, pinWalletLocked: true },
    notice: {
      title: "Pin Wallet disabled",
      body: "Your Pin Wallet has been temporarily disabled by the admin. Please contact support for details.",
    },
  },
};

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { userId, action } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data, notice } = ACTIONS[action];
  await prisma.user.update({ where: { id: userId }, data });
  await prisma.notification.create({ data: { userId, title: notice.title, body: notice.body } });

  return NextResponse.json({ ok: true, action });
}
