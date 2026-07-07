import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { tierByKey, tierIsEligible, nextClaimableTier, specialLoanEligible, SPECIAL_LOAN_KEY, formatRupees, LOAN_TIERS, loansPaused, LOAN_PAUSE_MESSAGE, countActivePanLoanConflicts, PAN_CONFLICT_MESSAGE, countIdentityLoanConflicts, IDENTITY_CONFLICT_MESSAGE } from "@/lib/loan";
import { getLegFillDepths } from "@/lib/network";

// Allowed tier keys = the leg-based ladder plus the standalone Special Loan.
const ALLOWED_TIER_KEYS = [SPECIAL_LOAN_KEY, ...LOAN_TIERS.map((t) => t.key)] as [string, ...string[]];
const bodySchema = z.object({
  tierKey: z.enum(ALLOWED_TIER_KEYS),
  whatsappNumber: z.string().regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit WhatsApp number"),
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
  const [me, directLeftSlots, directRightSlots, fillDepths, openLoan, closedLoans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leftLegCount: true, rightLegCount: true },
    }),
    prisma.user.count({ where: { referrerId: session.user.id, slot: "LEFT" } }),
    prisma.user.count({ where: { referrerId: session.user.id, slot: "RIGHT" } }),
    getLegFillDepths(session.user.id),
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

  // PAN reuse guard: another account on this PAN already holds an active loan.
  const panConflict = await countActivePanLoanConflicts(prisma, session.user.id);
  if (panConflict.conflictCount > 0) {
    return NextResponse.json({ error: PAN_CONFLICT_MESSAGE }, { status: 400 });
  }

  // Identity reuse guard: mobile / bank account / email already used by another
  // account that has taken a loan — permanent block.
  const identityConflict = await countIdentityLoanConflicts(prisma, session.user.id);
  if (identityConflict.conflictCount > 0) {
    return NextResponse.json({ error: IDENTITY_CONFLICT_MESSAGE, code: "IDENTITY_CONFLICT" }, { status: 400 });
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
    leftFillDepth: fillDepths.leftFillDepth,
    rightFillDepth: fillDepths.rightFillDepth,
    completedTierKeys,
  };

  if (tier.key === SPECIAL_LOAN_KEY) {
    // The Special Loan sits outside the sequential ladder — it only requires
    // that the member has completed (repaid) their Level-1 Rs. 2,000 loan.
    if (!specialLoanEligible(ctx)) {
      return NextResponse.json(
        { error: "The Special Loan unlocks once you have completed your Rs. 2,000 loan." },
        { status: 400 },
      );
    }
  } else {
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
  }

  const loan = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: { whatsappNumber: parsed.data.whatsappNumber },
    });
    return tx.loan.create({
      data: {
        userId: session.user.id,
        tierKey: tier.key,
        amount: tier.amount,
        totalWeeks: tier.totalWeeks,
        status: "REQUESTED",
      },
    });
  });

  return NextResponse.json({ ok: true, id: loan.id });
}
