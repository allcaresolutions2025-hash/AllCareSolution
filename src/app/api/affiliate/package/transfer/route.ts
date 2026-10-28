import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MIN_TRANSFER_POINTS = 100;
const bodySchema = z.object({
  points: z.number().int().min(MIN_TRANSFER_POINTS, `Minimum transfer is ${MIN_TRANSFER_POINTS} points`),
});

// Move package earnings into the member's e-wallet (balanceAvailable), from
// where the usual withdraw / daily payout flow takes over.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const amountPaise = parsed.data.points * 100;

  try {
    await prisma.$transaction(async (tx) => {
      const dec = await tx.packageAccount.updateMany({
        where: { userId: session.user.id, walletBalance: { gte: amountPaise } },
        data: { walletBalance: { decrement: amountPaise } },
      });
      if (dec.count === 0) throw new Error("INSUFFICIENT");
      await tx.wallet.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, balanceAvailable: amountPaise },
        update: { balanceAvailable: { increment: amountPaise } },
      });
      await tx.packageEarning.create({
        data: {
          userId: session.user.id,
          type: "TRANSFER_OUT",
          amount: -amountPaise,
          note: "Moved to e-wallet",
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT") {
      return NextResponse.json({ error: "Not enough package earnings to transfer." }, { status: 400 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
