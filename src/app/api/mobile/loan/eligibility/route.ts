import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";
import { LOAN_TIERS, tierIsEligible, tierIsCompleted, nextClaimableTier, loansPaused, LOAN_PAUSE_MESSAGE, LOAN_PAUSE_UNTIL, countActivePanLoanConflicts, PAN_CONFLICT_MESSAGE } from "@/lib/loan";
import { getLegFillDepths } from "@/lib/network";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const [me, directLeftSlots, directRightSlots, fillDepths, openLoan, closedLoans, panConflict] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { leftLegCount: true, rightLegCount: true, phone: true, whatsappNumber: true },
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
      countActivePanLoanConflicts(prisma, auth.user.id),
    ]);
    const panBlocked = panConflict.conflictCount > 0;

    const completedTierKeys = closedLoans.map((l) => l.tierKey);
    const ctx = {
      leftLegCount: me?.leftLegCount ?? 0,
      rightLegCount: me?.rightLegCount ?? 0,
      directLeftSlots,
      directRightSlots,
      leftFillDepth: fillDepths.leftFillDepth,
      rightFillDepth: fillDepths.rightFillDepth,
      completedTierKeys,
    };

    const nextTier = nextClaimableTier(ctx);
    const paused = loansPaused();
    return NextResponse.json({
      context: ctx,
      openLoan,
      paused,
      pauseMessage: paused ? LOAN_PAUSE_MESSAGE : null,
      pauseUntil: paused ? LOAN_PAUSE_UNTIL.toISOString() : null,
      panBlocked,
      panBlockMessage: panBlocked ? PAN_CONFLICT_MESSAGE : null,
      // For prefilling the WhatsApp input on the apply form.
      registeredPhone: me?.phone ?? null,
      savedWhatsappNumber: me?.whatsappNumber ?? null,
      nextClaimableTierKey: nextTier?.key ?? null,
      tiers: LOAN_TIERS.map((t) => {
        const completed = tierIsCompleted(t, ctx);
        const thresholdMet = tierIsEligible(t, ctx);
        const canClaim = !openLoan && !paused && !panBlocked && nextTier?.key === t.key;
        return {
          key: t.key,
          label: t.label,
          amountPaise: t.amount,
          amountLabel: t.amountLabel,
          totalWeeks: t.totalWeeks,
          kind: t.kind,
          legCount: t.legCount,
          completed,
          // True if member's leg counts have crossed this tier's threshold and
          // it isn't already completed — used for "Eligible" badges.
          eligible: thresholdMet,
          // True only for the single tier the user can actually apply for now
          // (lowest uncompleted threshold-met tier; honors sequential claiming).
          canClaim,
        };
      }),
    });
  } catch (e) {
    return mobileServerError("loan.eligibility", e);
  }
}
