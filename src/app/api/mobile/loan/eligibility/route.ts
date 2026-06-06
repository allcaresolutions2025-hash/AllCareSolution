import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";
import { LOAN_TIERS, tierIsEligible, tierIsCompleted } from "@/lib/loan";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const [me, directLeftSlots, directRightSlots, openLoan, closedLoans] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { leftLegCount: true, rightLegCount: true },
      }),
      prisma.user.count({ where: { referrerId: auth.user.id, slot: "LEFT" } }),
      prisma.user.count({ where: { referrerId: auth.user.id, slot: "RIGHT" } }),
      prisma.loan.findFirst({
        where: { userId: auth.user.id, status: { in: ["REQUESTED", "APPROVED"] } },
        select: { id: true, status: true },
      }),
      prisma.loan.findMany({
        where: { userId: auth.user.id, status: "CLOSED" },
        select: { tierKey: true },
      }),
    ]);

    const completedTierKeys = closedLoans.map((l) => l.tierKey);
    const ctx = {
      leftLegCount: me?.leftLegCount ?? 0,
      rightLegCount: me?.rightLegCount ?? 0,
      directLeftSlots,
      directRightSlots,
      completedTierKeys,
    };

    return NextResponse.json({
      context: ctx,
      openLoan,
      tiers: LOAN_TIERS.map((t) => {
        const completed = tierIsCompleted(t, ctx);
        return {
          key: t.key,
          label: t.label,
          amountPaise: t.amount,
          amountLabel: t.amountLabel,
          totalWeeks: t.totalWeeks,
          kind: t.kind,
          legCount: t.legCount,
          completed,
          eligible: !openLoan && tierIsEligible(t, ctx),
        };
      }),
    });
  } catch (e) {
    return mobileServerError("loan.eligibility", e);
  }
}
