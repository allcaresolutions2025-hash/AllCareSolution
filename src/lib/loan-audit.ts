import { prisma } from "./db";
import { getLegFillDepths } from "./network";
import { tierByKey, tierIsEligible, type EligibilityContext } from "./loan";

export type LoanAuditRow = {
  loanId: string;
  userId: string;
  userName: string;
  userCode: string;
  userEmail: string;
  tierKey: string;
  tierLabel: string;
  amount: number;            // paise
  requiredLevel: number;     // tier level => members needed per side = 2^level - 1
  requiredPerSide: number;
  leftFillDepth: number;
  rightFillDepth: number;
  eligible: boolean;
};

/**
 * Evaluate every REQUESTED loan against the *current* eligibility rules
 * (completely-filled binary tree to the tier's level on both legs). Used by the
 * admin audit tool to preview — and then lock — requests that no longer qualify.
 *
 * Only REQUESTED loans are considered. APPROVED loans (already disbursed) and
 * CLOSED loans are intentionally left untouched.
 */
export async function auditRequestedLoans(): Promise<LoanAuditRow[]> {
  const requested = await prisma.loan.findMany({
    where: { status: "REQUESTED" },
    orderBy: { requestedAt: "asc" },
    select: {
      id: true,
      tierKey: true,
      amount: true,
      userId: true,
      user: {
        select: { name: true, email: true, referralCode: true, leftLegCount: true, rightLegCount: true },
      },
    },
  });
  if (requested.length === 0) return [];

  // Completed (CLOSED) tiers per user, so an already-claimed tier stays out.
  const userIds = Array.from(new Set(requested.map((l) => l.userId)));
  const closed = await prisma.loan.findMany({
    where: { userId: { in: userIds }, status: "CLOSED" },
    select: { userId: true, tierKey: true },
  });
  const completedByUser = new Map<string, string[]>();
  for (const c of closed) {
    const arr = completedByUser.get(c.userId) ?? [];
    arr.push(c.tierKey);
    completedByUser.set(c.userId, arr);
  }

  const rows: LoanAuditRow[] = [];
  for (const loan of requested) {
    const tier = tierByKey(loan.tierKey);
    const fd = await getLegFillDepths(loan.userId);
    const ctx: EligibilityContext = {
      leftLegCount: loan.user.leftLegCount,
      rightLegCount: loan.user.rightLegCount,
      // A filled direct slot is exactly fillDepth >= 1, so reuse the depths.
      directLeftSlots: fd.leftFillDepth,
      directRightSlots: fd.rightFillDepth,
      leftFillDepth: fd.leftFillDepth,
      rightFillDepth: fd.rightFillDepth,
      completedTierKeys: completedByUser.get(loan.userId) ?? [],
    };
    const eligible = tier ? tierIsEligible(tier, ctx) : false;
    const level = tier?.level ?? 0;
    rows.push({
      loanId: loan.id,
      userId: loan.userId,
      userName: loan.user.name,
      userCode: loan.user.referralCode,
      userEmail: loan.user.email,
      tierKey: loan.tierKey,
      tierLabel: tier?.label ?? loan.tierKey,
      amount: loan.amount,
      requiredLevel: level,
      requiredPerSide: level > 0 ? 2 ** level - 1 : 0,
      leftFillDepth: fd.leftFillDepth,
      rightFillDepth: fd.rightFillDepth,
      eligible,
    });
  }
  return rows;
}
