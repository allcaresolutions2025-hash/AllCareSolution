import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { tierByKey, tierIsEligible, nextClaimableTier, formatRupees, LOAN_TIERS, loansPaused, LOAN_PAUSE_MESSAGE } from "@/lib/loan";

const bodySchema = z.object({
  tierKey: z.enum(LOAN_TIERS.map((t) => t.key) as [string, ...string[]]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  if (loansPaused()) {
    return NextResponse.json({ error: LOAN_PAUSE_MESSAGE }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const tier = tierByKey(parsed.data.tierKey);
  if (!tier) return NextResponse.json({ error: "Unknown tier" }, { status: 400 });

  // Re-verify eligibility server-side so a malicious client can't request a
  // tier they don't actually qualify for.
  const [me, directLeftSlots, directRightSlots, openLoan, closedLoans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leftLegCount: true, rightLegCount: true },
    }),
    prisma.user.count({ where: { referrerId: session.user.id, slot: "LEFT" } }),
    prisma.user.count({ where: { referrerId: session.user.id, slot: "RIGHT" } }),
    prisma.loan.findFirst({
      where: { userId: session.user.id, status: { in: ["REQUESTED", "APPROVED"] } },
      select: { id: true, status: true },
    }),
    prisma.loan.findMany({
      where: { userId: session.user.id, status: "CLOSED" },
      select: { tierKey: true },
    }),
  ]);

  if (openLoan) {
    return NextResponse.json(
      { error: `You already have a ${openLoan.status.toLowerCase()} loan` },
      { status: 400 },
    );
  }

  const completedTierKeys = closedLoans.map((l) => l.tierKey);
  if (completedTierKeys.includes(tier.key)) {
    return NextResponse.json(
      { error: "You have already completed this loan tier. Move on to the next level." },
      { status: 400 },
    );
  }

  const ctx = {
    leftLegCount: me?.leftLegCount ?? 0,
    rightLegCount: me?.rightLegCount ?? 0,
    directLeftSlots,
    directRightSlots,
    completedTierKeys,
  };
  if (!tierIsEligible(tier, ctx)) {
    return NextResponse.json({ error: "You do not qualify for this tier yet" }, { status: 400 });
  }
  const next = nextClaimableTier(ctx);
  if (!next || next.key !== tier.key) {
    return NextResponse.json(
      {
        error: next
          ? `Complete the ${formatRupees(next.amount)} loan first before applying for this tier.`
          : "You do not qualify for any tier yet.",
      },
      { status: 400 },
    );
  }

  const loan = await prisma.loan.create({
    data: {
      userId: session.user.id,
      tierKey: tier.key,
      amount: tier.amount,
      totalWeeks: tier.totalWeeks,
      status: "REQUESTED",
    },
  });

  return NextResponse.json({ ok: true, id: loan.id });
}
