import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";
import { pointsToPaise, formatPoints } from "@/lib/money";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Pro Max admin credits points to a member. Two targets:
//   PIN_WALLET — pinWalletBalance (usable to buy pins); logged as a PinWalletTxn.
//   POINTS     — proMaxBalanceAvailable (Pro Max earnings, paid by the nightly cycle).
// Identify the member by internal userId (used by the Members table) OR by their
// AM-prefixed Member ID (used by the dedicated Add Points page).
const bodySchema = z.object({
  userId: z.string().min(1).optional(),
  memberCode: z.string().regex(/^AM[0-9]{8}$/, "Member ID must be AM-prefixed").optional(),
  target: z.enum(["PIN_WALLET", "POINTS"]),
  points: z.number().positive().max(10_000_000),
  note: z.string().max(300).optional(),
}).refine((d) => d.userId || d.memberCode, { message: "Provide a member" });

export async function POST(req: Request) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { userId, memberCode, target, points, note } = parsed.data;
  const amountPaise = pointsToPaise(points);
  if (amountPaise <= 0) return NextResponse.json({ error: "Enter a positive amount" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: userId ? { id: userId } : { referralCode: memberCode },
    select: { id: true, isProMax: true, name: true },
  });
  if (!user || !user.isProMax) return NextResponse.json({ error: "Pro Max member not found" }, { status: 404 });
  const targetUserId = user.id;

  const newBalance = await prisma.$transaction(async (tx) => {
    if (target === "PIN_WALLET") {
      const wallet = await tx.wallet.upsert({
        where: { userId: targetUserId },
        create: { userId: targetUserId, pinWalletBalance: amountPaise },
        update: { pinWalletBalance: { increment: amountPaise } },
      });
      await tx.pinWalletTxn.create({
        data: {
          userId: targetUserId,
          type: "ADMIN_CREDIT",
          amount: amountPaise,
          balanceAfter: wallet.pinWalletBalance,
          note: note?.trim() || "Pro Max admin credit",
        },
      });
      await tx.notification.create({
        data: {
          userId: targetUserId,
          title: "Pin Wallet credited",
          body: `Admin added ${formatPoints(amountPaise)} to your Pro Max Pin Wallet.${note?.trim() ? ` Note: ${note.trim()}` : ""}`,
        },
      });
      return wallet.pinWalletBalance;
    }
    // POINTS — Pro Max earnings wallet.
    const wallet = await tx.wallet.upsert({
      where: { userId: targetUserId },
      create: { userId: targetUserId, proMaxBalanceAvailable: amountPaise },
      update: { proMaxBalanceAvailable: { increment: amountPaise } },
    });
    await tx.notification.create({
      data: {
        userId: targetUserId,
        title: "Pro Max points credited",
        body: `Admin added ${formatPoints(amountPaise)} Pro Max points to your wallet.${note?.trim() ? ` Note: ${note.trim()}` : ""}`,
      },
    });
    return wallet.proMaxBalanceAvailable;
  });

  return NextResponse.json({ ok: true, newBalance, memberName: user.name });
}
