// Loan eligibility ladder. Amounts and durations were set by the business; see
// the achieved-offers spec. Stored in paise to stay consistent with the rest of
// the codebase (1 INR = 100 paise).
//
// Each tier corresponds to a binary-tree level. A user reaches level N when the
// binary tree under them is COMPLETELY FILLED to depth N on BOTH legs — every
// slot in levels 1..N is occupied, no gaps. A perfect tree of depth N holds
// 2^N - 1 members, which is why the tier labels read "7 on Left & 7 on Right"
// (level 3), "31 & 31" (level 5), and so on.
//
// Eligibility is measured by each leg's *fill depth* (leftFillDepth /
// rightFillDepth) — the deepest level to which that leg is a perfect binary
// tree with no empty slots — NOT by raw leg head-counts. This matters: a deep
// but lopsided leg (e.g. one child with a long tail, the sibling slot empty)
// can blow past a raw count threshold while still having a hole near the top.
// Such a member is NOT eligible until both immediate sides are actually filled.
// `highestEligibleTier` picks the largest tier whose level both legs fill.
// Only certain levels grant loans: 1, 3, 5, 7, 9, 10, 11, 12, 13, 14, 15.
// Level 1 is special-cased to direct slots (1 direct on Left + 1 on Right),
// which is equivalent to leftFillDepth=rightFillDepth>=1.

export type LoanTier = {
  key: string;
  level: number;            // binary-tree level (1, 3, 5, ...); 0 for the Special Loan
  label: string;            // human description of the requirement
  amount: number;           // paise
  amountLabel: string;      // pretty rupee label
  totalWeeks: number;
  // Either a leg-count tier (legCount), the directs-1-1 tier (directs), or the
  // standalone Special Loan (special) which is unlocked by completing Level 1.
  kind: "directs" | "legCount" | "special";
  legCount?: number;
};

export const LOAN_TIERS: LoanTier[] = [
  { key: "DIRECTS_1_1", level:  1, kind: "directs",                       label: "Level 1 — 1 member on Left & 1 on Right",                amount:        200_000, amountLabel: "Rs. 2,000",     totalWeeks: 2 },
  { key: "LEG_7",       level:  3, kind: "legCount", legCount:     7,     label: "Level 3 — 7 members on Left & 7 on Right",               amount:      1_000_000, amountLabel: "Rs. 10,000",    totalWeeks: 4 },
  { key: "LEG_31",      level:  5, kind: "legCount", legCount:    31,     label: "Level 5 — 31 members on Left & 31 on Right",             amount:      2_000_000, amountLabel: "Rs. 20,000",    totalWeeks: 5 },
  { key: "LEG_127",     level:  7, kind: "legCount", legCount:   127,     label: "Level 7 — 127 members on Left & 127 on Right",           amount:      3_000_000, amountLabel: "Rs. 30,000",    totalWeeks: 6 },
  { key: "LEG_511",     level:  9, kind: "legCount", legCount:   511,     label: "Level 9 — 511 members on Left & 511 on Right",           amount:      5_000_000, amountLabel: "Rs. 50,000",    totalWeeks: 10 },
  { key: "LEG_1023",    level: 10, kind: "legCount", legCount:  1023,     label: "Level 10 — 1,023 members on Left & 1,023 on Right",      amount:     10_000_000, amountLabel: "Rs. 1 Lakh",    totalWeeks: 10 },
  { key: "LEG_2047",    level: 11, kind: "legCount", legCount:  2047,     label: "Level 11 — 2,047 members on Left & 2,047 on Right",      amount:     20_000_000, amountLabel: "Rs. 2 Lakhs",   totalWeeks: 20 },
  { key: "LEG_4095",    level: 12, kind: "legCount", legCount:  4095,     label: "Level 12 — 4,095 members on Left & 4,095 on Right",      amount:     30_000_000, amountLabel: "Rs. 3 Lakhs",   totalWeeks: 30 },
  { key: "LEG_8191",    level: 13, kind: "legCount", legCount:  8191,     label: "Level 13 — 8,191 members on Left & 8,191 on Right",      amount:     50_000_000, amountLabel: "Rs. 5 Lakhs",   totalWeeks: 25 },
  { key: "LEG_16383",   level: 14, kind: "legCount", legCount: 16383,     label: "Level 14 — 16,383 members on Left & 16,383 on Right",    amount:  100_000_000, amountLabel: "Rs. 10 Lakhs",  totalWeeks: 50 },
  { key: "LEG_32767",   level: 15, kind: "legCount", legCount: 32767,     label: "Level 15 — 32,767 members on Left & 32,767 on Right",    amount: 10_000_000_00, amountLabel: "Rs. 1 Crore",   totalWeeks: 100 },
];

// ---- Special Loan (post Level-1) -------------------------------------------
// A one-time offer that sits OUTSIDE the leg-based ladder. Once a member has
// completed (fully repaid) their Level-1 Rs. 2,000 loan, they may take a
// Rs. 5,000 "Special Loan", credited to their Pin Wallet, repaid Rs. 2,500 per
// week for 2 weeks. Eligibility does NOT depend on leg fill depth, and taking
// it does not block or advance the leg-based ladder. Every Rs. 2,000-loan
// graduate is eligible, once.
export const LEVEL1_LOAN_KEY = "DIRECTS_1_1";
export const SPECIAL_LOAN_KEY = "SPECIAL_5000";

export const SPECIAL_LOAN_TIER: LoanTier = {
  key: SPECIAL_LOAN_KEY,
  level: 0,
  kind: "special",
  label: "Special Loan — for members who completed the Rs. 2,000 loan",
  amount: 500_000, // Rs. 5,000
  amountLabel: "Rs. 5,000",
  totalWeeks: 2, // Rs. 2,500 per week x 2
};

// A member qualifies for the Special Loan once they have CLOSED (fully repaid)
// their Level-1 Rs. 2,000 loan and have not already taken the Special Loan.
export function specialLoanEligible(ctx: EligibilityContext): boolean {
  const done = ctx.completedTierKeys ?? [];
  return done.includes(LEVEL1_LOAN_KEY) && !done.includes(SPECIAL_LOAN_KEY);
}

export function tierByKey(key: string): LoanTier | undefined {
  if (key === SPECIAL_LOAN_KEY) return SPECIAL_LOAN_TIER;
  return LOAN_TIERS.find((t) => t.key === key);
}

// Temporary maintenance window — new loan applications are blocked until this
// instant. 2026-06-12 09:00 IST == 2026-06-12 03:30 UTC.
export const LOAN_PAUSE_UNTIL = new Date("2026-06-12T03:30:00.000Z");
export const LOAN_PAUSE_MESSAGE =
  "Loan applications are paused while we perform maintenance on the website. Please try again tomorrow at 9:00 AM IST.";

export function loansPaused(now: Date = new Date()): boolean {
  return now < LOAN_PAUSE_UNTIL;
}

export type EligibilityContext = {
  leftLegCount: number;
  rightLegCount: number;
  directLeftSlots: number;   // count of direct children with slot=LEFT
  directRightSlots: number;  // count of direct children with slot=RIGHT
  // Deepest level to which each leg is a *perfectly filled* binary tree (no
  // empty slots in levels 1..N). This — not the raw leg counts above — decides
  // legCount-tier eligibility. See getLegFillDepths in lib/network.ts.
  // Optional for back-compat; when omitted, falls back to the leg-count
  // threshold (legacy behaviour).
  leftFillDepth?: number;
  rightFillDepth?: number;
  // Tier keys the user has already taken & repaid (LoanStatus.CLOSED). Each
  // tier can be claimed only once per user — once closed it is permanently
  // locked, regardless of whether the user still meets the leg requirements.
  completedTierKeys?: readonly string[];
};

export function tierIsCompleted(tier: LoanTier, ctx: EligibilityContext): boolean {
  return ctx.completedTierKeys?.includes(tier.key) ?? false;
}

export function tierIsEligible(tier: LoanTier, ctx: EligibilityContext): boolean {
  if (tierIsCompleted(tier, ctx)) return false;
  if (tier.kind === "special") {
    // Special Loan: gated only by having completed the Level-1 loan.
    return specialLoanEligible(ctx);
  }
  if (tier.kind === "directs") {
    return ctx.directLeftSlots >= 1 && ctx.directRightSlots >= 1;
  }
  // legCount tiers require the binary tree to be COMPLETELY filled to this
  // tier's level on both legs — i.e. each leg's fill depth reaches the level.
  // A perfect tree of depth `level` holds `legCount` members, so this is the
  // structural equivalent of the old "leg count >= legCount" rule but without
  // the hole-tolerating loophole.
  if (ctx.leftFillDepth !== undefined && ctx.rightFillDepth !== undefined) {
    return ctx.leftFillDepth >= tier.level && ctx.rightFillDepth >= tier.level;
  }
  // Legacy fallback when fill depths weren't supplied (head-count threshold).
  return ctx.leftLegCount >= (tier.legCount ?? 0) && ctx.rightLegCount >= (tier.legCount ?? 0);
}

export function highestEligibleTier(ctx: EligibilityContext): LoanTier | null {
  for (let i = LOAN_TIERS.length - 1; i >= 0; i--) {
    if (tierIsEligible(LOAN_TIERS[i], ctx)) return LOAN_TIERS[i];
  }
  return null;
}

// Sequential claiming: a user can only apply for the LOWEST uncompleted tier
// whose threshold they meet. Higher tiers stay locked behind it even if the
// member's leg counts already exceed them — they must clear lower loans first.
// Returns null if there is no qualifying next tier.
export function nextClaimableTier(ctx: EligibilityContext): LoanTier | null {
  for (const tier of LOAN_TIERS) {
    if (tierIsCompleted(tier, ctx)) continue;
    if (tierIsEligible(tier, ctx)) return tier;
    // LOAN_TIERS is ordered ascending by threshold. If this uncompleted tier's
    // threshold isn't met, no higher tier's threshold is either.
    return null;
  }
  return null;
}

export function tierCanClaim(tier: LoanTier, ctx: EligibilityContext): boolean {
  const next = nextClaimableTier(ctx);
  return next !== null && next.key === tier.key;
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

// Paying a loan installment with Pin Wallet points carries a 9% convenience
// surcharge on the installment amount, plus any accrued overdue penalty. All
// values are paise. e.g. a ₹1,000 installment costs 1,090; ₹2,500 costs 2,725.
// ---- Pin Wallet -> payout transfer floor -----------------------------------
// Standard members must transfer at least 3,000 points at a time from the Pin
// Wallet to their payout wallet. Members who have taken a loan of Rs. 5,000 or
// more (the Special Loan or any higher-ladder loan) must instead have/transfer
// at least 6,000 points — below that they can only spend Pin Wallet points on
// pins. The Rs. 2,000-only borrowers keep the 3,000 floor.
export const MIN_WITHDRAW_POINTS = 3000;
export const MIN_WITHDRAW_POINTS_BIG_LOAN = 6000;
export const BIG_LOAN_THRESHOLD_PAISE = 500_000; // Rs. 5,000

export const LOAN_WALLET_SURCHARGE_PCT = 9;

export function loanWalletSurcharge(installmentPaise: number): number {
  return Math.round((installmentPaise * LOAN_WALLET_SURCHARGE_PCT) / 100);
}

export function loanWalletChargePaise(installmentPaise: number, penaltyPaise = 0): number {
  return installmentPaise + loanWalletSurcharge(installmentPaise) + penaltyPaise;
}

// PAN reuse guard. A single PAN may be held by up to 15 accounts (a family
// hierarchy), but only ONE of those accounts may have an active loan at a
// time. This function returns the count of OTHER users sharing this user's
// PAN who currently have a REQUESTED or APPROVED loan — used to block new
// loan applications and to flag duplicates in the admin queue.
export async function countActivePanLoanConflicts(
  prisma: import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient,
  userId: string,
  proMax = false,
): Promise<{ pan: string | null; conflictCount: number }> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { panNumber: true },
  });
  if (!me?.panNumber) return { pan: null, conflictCount: 0 };
  const conflictCount = await prisma.loan.count({
    where: {
      proMax,
      status: { in: ["REQUESTED", "APPROVED"] },
      user: { panNumber: me.panNumber, id: { not: userId } },
    },
  });
  return { pan: me.panNumber, conflictCount };
}

export const PAN_CONFLICT_MESSAGE =
  "A loan is already active under this PAN on another account. Please close the existing loan before applying again.";

// Identity-reuse guard: a PERMANENT block if the applicant's mobile, bank
// account number, or email is already tied to ANY other account that has taken
// a loan (requested / active / closed — anything except a rejected request).
// One person, identified by any of these details, can only ever take loans
// through a single account.
export async function countIdentityLoanConflicts(
  prisma: import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient,
  userId: string,
  proMax = false,
): Promise<{ conflictCount: number }> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, bankAccountNumber: true, email: true },
  });
  if (!me) return { conflictCount: 0 };

  const orConds: import("@prisma/client").Prisma.UserWhereInput[] = [];
  if (me.phone) orConds.push({ phone: me.phone });
  if (me.bankAccountNumber) orConds.push({ bankAccountNumber: me.bankAccountNumber });
  if (me.email) orConds.push({ email: me.email });
  if (orConds.length === 0) return { conflictCount: 0 };

  const conflictCount = await prisma.loan.count({
    where: {
      proMax, // scope to the same programme (1,000-pt vs Pro Max)
      status: { not: "REJECTED" }, // requested / approved / closed all count as "got a loan"
      user: { id: { not: userId }, OR: orConds },
    },
  });
  return { conflictCount };
}

export const IDENTITY_CONFLICT_MESSAGE =
  "Your email, mobile number, or bank account is already used on another account that has taken a loan. You are not eligible to apply for a loan.";

// Days overdue, counted by IST calendar day. An installment due today (IST)
// returns 0; due yesterday returns 1; etc. Comparing IST midnight to IST
// midnight avoids the wrong-by-one bug where a dueDate whose UTC instant is
// less than 24h before today's IST midnight would floor to 0 days even
// though its IST calendar date has already passed.
export function daysOverdueIst(dueDate: Date, now: Date = new Date()): number {
  const istDay = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
  const dueMidnightUtc = new Date(`${istDay(dueDate)}T00:00:00+05:30`).getTime();
  const nowMidnightUtc = new Date(`${istDay(now)}T00:00:00+05:30`).getTime();
  return Math.max(0, Math.round((nowMidnightUtc - dueMidnightUtc) / (24 * 60 * 60 * 1000)));
}
