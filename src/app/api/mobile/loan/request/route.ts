import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";
import { LOAN_TIERS, tierByKey, tierIsEligible, nextClaimableTier, hasTakenLevel2Loan, formatRupees, loansPaused, LOAN_PAUSE_MESSAGE, countActivePanLoanConflicts, PAN_CONFLICT_MESSAGE, countIdentityLoanConflicts, IDENTITY_CONFLICT_MESSAGE } from "@/lib/loan";
import { getLegFillDepths } from "@/lib/network";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  tierKey: z.enum(LOAN_TIERS.map((t) => t.key) as [string, ...string[]]),
  whatsappNumber: z.string().regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit WhatsApp number"),
});

export async function POST(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    if (loansPaused()) {
      return NextResponse.json({ error: LOAN_PAUSE_MESSAGE }, { status: 503 });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const tier = tierByKey(parsed.data.tierKey);
    if (!tier) return NextResponse.json({ error: "Unknown tier" }, { status: 400 });

    const [me, directLeftSlots, directRightSlots, fillDepths, openLoan, closedLoans, level2Taken] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { leftLegCount: true, rightLegCount: true },
      }),
      prisma.user.count({ where: { referrerId: auth.user.id, slot: "LEFT" } }),
      prisma.user.count({ where: { referrerId: auth.user.id, slot: "RIGHT" } }),
      getLegFillDepths(auth.user.id),
      prisma.loan.findFirst({
        where: { userId: auth.user.id, status: { in: ["REQUESTED", "APPROVED"] } },
        select: { id: true, status: true },
      }),
      prisma.loan.findMany({
        where: { userId: auth.user.id, status: "CLOSED" },
        select: { tierKey: true },
      }),
      hasTakenLevel2Loan(prisma, auth.user.id),
    ]);

    if (openLoan) {
      return NextResponse.json(
        { error: `You already have a ${openLoan.status.toLowerCase()} loan` },
        { status: 400 },
      );
    }

    // PAN reuse guard: another account on this PAN already holds an active loan.
    const panConflict = await countActivePanLoanConflicts(prisma, auth.user.id);
    if (panConflict.conflictCount > 0) {
      return NextResponse.json({ error: PAN_CONFLICT_MESSAGE }, { status: 400 });
    }

    // Identity reuse guard: mobile / bank account / email already used by
    // another account that has taken a loan — permanent block.
    const identityConflict = await countIdentityLoanConflicts(prisma, auth.user.id);
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
      hasTakenLevel2Loan: level2Taken,
    };
    if (!tierIsEligible(tier, ctx)) {
      return NextResponse.json(
        { error: "You do not qualify for this tier yet" },
        { status: 400 },
      );
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

    const loan = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: auth.user.id },
        data: { whatsappNumber: parsed.data.whatsappNumber },
      });
      return tx.loan.create({
        data: {
          userId: auth.user.id,
          tierKey: tier.key,
          amount: tier.amount,
          totalWeeks: tier.totalWeeks,
          status: "REQUESTED",
        },
      });
    });

    return NextResponse.json({ ok: true, id: loan.id });
  } catch (e) {
    return mobileServerError("loan.request", e);
  }
}
