// Pro Max (10,000-pt) loan ladder. Same binary-tree level structure and
// eligibility rule as the 1,000-pt ladder in lib/loan.ts (levels 1, 3, 5, 7, 9,
// 10, 11, 12, 13, 14, 15 — measured by Pro Max leg fill depth), but with the
// Pro Max loan amounts and repayment weeks from the PLAN 2 charts.
//
// Amount → weeks come straight from the loan repayment chart. Level 15 (Rs 10
// Crore) has no row on that chart; we use 100 weeks (same as Level 14) — adjust
// here if the business sets a different schedule.

import { type LoanTier, tierIsEligible, type EligibilityContext } from "./loan";

export const PROMAX_LOAN_TIERS: LoanTier[] = [
  { key: "DIRECTS_1_1", level:  1, kind: "directs",                   label: "Level 1 — 1 member on Left & 1 on Right",             amount:        1_000_000, amountLabel: "Rs. 10,000",   totalWeeks: 2 },
  { key: "LEG_7",       level:  3, kind: "legCount", legCount:     7,  label: "Level 3 — 7 members on Left & 7 on Right",            amount:        3_000_000, amountLabel: "Rs. 30,000",   totalWeeks: 4 },
  { key: "LEG_31",      level:  5, kind: "legCount", legCount:    31,  label: "Level 5 — 31 members on Left & 31 on Right",          amount:        5_000_000, amountLabel: "Rs. 50,000",   totalWeeks: 5 },
  { key: "LEG_127",     level:  7, kind: "legCount", legCount:   127,  label: "Level 7 — 127 members on Left & 127 on Right",        amount:       10_000_000, amountLabel: "Rs. 1 Lakh",   totalWeeks: 8 },
  { key: "LEG_511",     level:  9, kind: "legCount", legCount:   511,  label: "Level 9 — 511 members on Left & 511 on Right",        amount:       20_000_000, amountLabel: "Rs. 2 Lakhs",  totalWeeks: 10 },
  { key: "LEG_1023",    level: 10, kind: "legCount", legCount:  1023,  label: "Level 10 — 1,023 members on Left & 1,023 on Right",   amount:       30_000_000, amountLabel: "Rs. 3 Lakhs",  totalWeeks: 12 },
  { key: "LEG_2047",    level: 11, kind: "legCount", legCount:  2047,  label: "Level 11 — 2,047 members on Left & 2,047 on Right",   amount:       50_000_000, amountLabel: "Rs. 5 Lakhs",  totalWeeks: 20 },
  { key: "LEG_4095",    level: 12, kind: "legCount", legCount:  4095,  label: "Level 12 — 4,095 members on Left & 4,095 on Right",   amount:      100_000_000, amountLabel: "Rs. 10 Lakhs", totalWeeks: 40 },
  { key: "LEG_8191",    level: 13, kind: "legCount", legCount:  8191,  label: "Level 13 — 8,191 members on Left & 8,191 on Right",   amount:      500_000_000, amountLabel: "Rs. 50 Lakhs", totalWeeks: 50 },
  { key: "LEG_16383",   level: 14, kind: "legCount", legCount: 16383,  label: "Level 14 — 16,383 members on Left & 16,383 on Right", amount:    1_000_000_000, amountLabel: "Rs. 1 Crore",  totalWeeks: 100 },
  { key: "LEG_32767",   level: 15, kind: "legCount", legCount: 32767,  label: "Level 15 — 32,767 members on Left & 32,767 on Right", amount:   10_000_000_000, amountLabel: "Rs. 10 Crore", totalWeeks: 100 },
];

export function proMaxTierByKey(key: string): LoanTier | undefined {
  return PROMAX_LOAN_TIERS.find((t) => t.key === key);
}

export function proMaxHighestEligibleTier(ctx: EligibilityContext): LoanTier | null {
  for (let i = PROMAX_LOAN_TIERS.length - 1; i >= 0; i--) {
    if (tierIsEligible(PROMAX_LOAN_TIERS[i], ctx)) return PROMAX_LOAN_TIERS[i];
  }
  return null;
}

// Sequential claiming: only the lowest uncompleted tier whose threshold is met.
export function proMaxNextClaimableTier(ctx: EligibilityContext): LoanTier | null {
  for (const tier of PROMAX_LOAN_TIERS) {
    if (ctx.completedTierKeys?.includes(tier.key)) continue;
    if (tierIsEligible(tier, ctx)) return tier;
    return null; // ordered ascending — if this one's threshold isn't met, none above is
  }
  return null;
}
