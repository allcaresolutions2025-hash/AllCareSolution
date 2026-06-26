import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { pointsToPaise, formatPoints } from "@/lib/money";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.string().min(1),
  points: z.number().positive().max(10_000_000),
  note: z.string().max(300).optional(),
});

// Admin adds points to a member's Pin Wallet (usable to buy pins). Records a
// PinWalletTxn (ADMIN_CREDIT) and notifies the member in-app.
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { userId, points, note } = parsed.data;
  const amountPaise = pointsToPaise(points);
  if (amountPaise <= 0) return NextResponse.json({ error: "Enter a positive amount" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newBalance = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      create: { userId, pinWalletBalance: amountPaise },
      update: { pinWalletBalance: { increment: amountPaise } },
    });
    await tx.pinWalletTxn.create({
      data: {
        userId,
        type: "ADMIN_CREDIT",
        amount: amountPaise,
        balanceAfter: wallet.pinWalletBalance,
        note: note?.trim() || "Admin credit",
      },
    });
    await tx.notification.create({
      data: {
        userId,
        title: "Pin Wallet credited",
        body: `Admin added ${formatPoints(amountPaise)} to your Pin Wallet. Use it to buy pins from the Pin Wallet page.${note?.trim() ? ` Note: ${note.trim()}` : ""}`,
      },
    });
    return wallet.pinWalletBalance;
  });

  return NextResponse.json({ ok: true, newBalance });
}
