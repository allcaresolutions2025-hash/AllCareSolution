// Loan eligibility ladder. Amounts and durations were set by the business; see
// the achieved-offers spec. Stored in paise to stay consistent with the rest of
// the codebase (1 INR = 100 paise).
//
// Eligibility uses EXACT pair matching (per user decision): qualifies for a leg
// tier only when leftLegCount === rightLegCount AND equals the tier value. The
// smallest tier (2,000) uses direct-referral slots instead: at least one direct
// child in the LEFT slot AND one in the RIGHT slot.

export type LoanTier = {
  key: string;
  label: string;            // human description of the requirement
  amount: number;           // paise
  amountLabel: string;      // pretty rupee label
  totalWeeks: number;
  // Either a leg-count tier (legCount), or the directs-1-1 tier (directs).
  kind: "directs" | "legCount";
  legCount?: number;
};

export const LOAN_TIERS: LoanTier[] = [
  { key: "DIRECTS_1_1", kind: "directs",                       label: "1 direct on Left + 1 on Right", amount:        200_000, amountLabel: "Rs. 2,000",     totalWeeks: 2 },
  { key: "LEG_7",       kind: "legCount", legCount:     7,     label: "7 on Left & 7 on Right",         amount:      1_000_000, amountLabel: "Rs. 10,000",    totalWeeks: 4 },
  { key: "LEG_31",      kind: "legCount", legCount:    31,     label: "31 on Left & 31 on Right",       amount:      2_000_000, amountLabel: "Rs. 20,000",    totalWeeks: 5 },
  { key: "LEG_127",     kind: "legCount", legCount:   127,     label: "127 on Left & 127 on Right",     amount:      3_000_000, amountLabel: "Rs. 30,000",    totalWeeks: 6 },
  { key: "LEG_511",     kind: "legCount", legCount:   511,     label: "511 on Left & 511 on Right",     amount:      5_000_000, amountLabel: "Rs. 50,000",    totalWeeks: 10 },
  { key: "LEG_1023",    kind: "legCount", legCount:  1023,     label: "1,023 on Left & 1,023 on Right", amount:     10_000_000, amountLabel: "Rs. 1 Lakh",    totalWeeks: 10 },
  { key: "LEG_2047",    kind: "legCount", legCount:  2047,     label: "2,047 on Left & 2,047 on Right", amount:     20_000_000, amountLabel: "Rs. 2 Lakhs",   totalWeeks: 20 },
  { key: "LEG_4095",    kind: "legCount", legCount:  4095,     label: "4,095 on Left & 4,095 on Right", amount:     30_000_000, amountLabel: "Rs. 3 Lakhs",   totalWeeks: 30 },
  { key: "LEG_8191",    kind: "legCount", legCount:  8191,     label: "8,191 on Left & 8,191 on Right", amount:     50_000_000, amountLabel: "Rs. 5 Lakhs",   totalWeeks: 25 },
  { key: "LEG_16383",   kind: "legCount", legCount: 16383,     label: "16,383 on Left & 16,383 on Right", amount:  100_000_000, amountLabel: "Rs. 10 Lakhs",  totalWeeks: 50 },
  { key: "LEG_32767",   kind: "legCount", legCount: 32767,     label: "32,767 on Left & 32,767 on Right", amount: 10_000_000_00, amountLabel: "Rs. 1 Crore",   totalWeeks: 100 },
];

export function tierByKey(key: string): LoanTier | undefined {
  return LOAN_TIERS.find((t) => t.key === key);
}

export type EligibilityContext = {
  leftLegCount: number;
  rightLegCount: number;
  directLeftSlots: number;   // count of direct children with slot=LEFT
  directRightSlots: number;  // count of direct children with slot=RIGHT
};

export function tierIsEligible(tier: LoanTier, ctx: EligibilityContext): boolean {
  if (tier.kind === "directs") {
    return ctx.directLeftSlots >= 1 && ctx.directRightSlots >= 1;
  }
  // legCount tiers — exact pair match (per spec)
  return ctx.leftLegCount === tier.legCount && ctx.rightLegCount === tier.legCount;
}

export function highestEligibleTier(ctx: EligibilityContext): LoanTier | null {
  for (let i = LOAN_TIERS.length - 1; i >= 0; i--) {
    if (tierIsEligible(LOAN_TIERS[i], ctx)) return LOAN_TIERS[i];
  }
  return null;
}

// Build the per-week installment plan. Most tiers split evenly. The 2,000 tier
// is special-cased to 1,000 + 1,000 per spec, which is already even — but the
// general "split principal across weeks, give rounding remainder to the last
// week" approach handles it correctly without a branch.
export function buildInstallmentPlan(
  amountPaise: number,
  totalWeeks: number,
  startDate: Date,
): Array<{ weekNumber: number; amount: number; dueDate: Date }> {
  const base = Math.floor(amountPaise / totalWeeks);
  const plan = [];
  let allocated = 0;
  for (let i = 1; i <= totalWeeks; i++) {
    const isLast = i === totalWeeks;
    const amount = isLast ? amountPaise - allocated : base;
    allocated += amount;
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + 7 * i);
    plan.push({ weekNumber: i, amount, dueDate });
  }
  return plan;
}

// Format paise as a rupee string, e.g. 1_000_000 -> "Rs. 10,000". This loan
// domain shows money as actual rupees (not the "points" abstraction used
// elsewhere in the app).
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `Rs. ${rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// Overdue penalty tiers (in paise per day):
//   Loan >= Rs. 1,00,000  → Rs. 10,000 / day
//   Loan >= Rs. 10,000    → Rs.    500 / day
//   Otherwise             → Rs.    100 / day
export function calcDailyPenalty(loanAmountPaise: number): number {
  if (loanAmountPaise >= 10_000_000) return 1_000_000; // ₹10,000/day
  if (loanAmountPaise >= 1_000_000)  return 50_000;    // ₹500/day
  return 10_000;                                        // ₹100/day
}

export function calcTotalPenalty(loanAmountPaise: number, daysOverdue: number): number {
  if (daysOverdue <= 0) return 0;
  return calcDailyPenalty(loanAmountPaise) * daysOverdue;
}
