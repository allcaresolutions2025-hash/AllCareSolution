import { prisma } from "./db";
import { PAISE_PER_POINT } from "./money";

// Shared payout-and-reset logic used by both the nightly cron and the admin
// "Simulate midnight" button.
//
// Eligibility: only wallets with balanceAvailable >= MIN_PAYOUT_POINTS are
// paid out. Sub-threshold balances are left alone — they keep accumulating
// across nights until they cross the line.
//
// When force=false (the cron path), the run is idempotent against an IST-date
// checkpoint stored in Setting — re-running the same day is a no-op.
// When force=true (the admin test path), the checkpoint is ignored AND the
// run is keyed to a synthetic runDate string like "2026-05-23-test-3" so it
// doesn't collide with the real-day payout via the @@unique([userId, runDate]).

const PAY_RATIO = 0.9;
const SETTING_KEY = "points_decay_last_run_ist_date";

// Minimum balance (in displayed points) required to receive a payout.
export const MIN_PAYOUT_POINTS = 500;
const MIN_PAYOUT_PAISE = MIN_PAYOUT_POINTS * PAISE_PER_POINT;

export function istDateString(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

export type DailyPayoutResult = {
  skipped: boolean;
  date: string;
  forced: boolean;
  scope: PayoutScope;
  payoutsCreated?: number;
  walletsReset?: number;
  gatedCacheCleared?: number;
  totalPaid?: number;
  totalForfeit?: number;
};

// Which wallet program(s) a run processes. "standard" = the 1000-pt
// balanceAvailable, "proMax" = proMaxBalanceAvailable. "all" (the nightly cron)
// runs the 1000-pt payout only — the Pro Max payout is manual (admin-triggered
// scope "proMax") and never runs automatically.
export type PayoutScope = "standard" | "proMax" | "all";

export async function runDailyPayout(
  opts: { force?: boolean; scope?: PayoutScope } = {},
): Promise<DailyPayoutResult> {
  const force = opts.force ?? false;
  const scope = opts.scope ?? "all";
  const doStandard = scope !== "proMax";
  // The Pro Max (10,000-pt) payout is MANUAL ONLY — it runs solely when the
  // Pro Max admin explicitly triggers scope "proMax". The nightly cron uses
  // scope "all", which intentionally does NOT include Pro Max here, so there is
  // no automatic 00:00 IST Pro Max payout.
  const doProMax = scope === "proMax";
  const today = istDateString();

  // The IST-date checkpoint only governs the nightly all-scope run.
  if (!force && scope === "all") {
    const last = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (last?.value === today) {
      return { skipped: true, date: today, forced: false, scope };
    }
  }

  // For forced (test) runs, derive a unique synthetic runDate so we don't
  // clash with the real-day idempotency key on DailyPayout.
  const runDate = force ? await nextTestRunDate(today) : today;

  const result = await prisma.$transaction(async (tx) => {
    let totalPaid = 0;
    let totalForfeit = 0;
    let created = 0;
    let resetCount = 0;
    let cacheCleared = 0;

    // ---- 1000-pt wallet (balanceAvailable)
    if (doStandard) {
      const wallets = await tx.wallet.findMany({
        // Eligibility also requires both legs filled: at least one member on
        // the LEFT leg AND at least one on the RIGHT leg. Members with an empty
        // leg do not enter the daily payout until they fill both sides.
        where: {
          balanceAvailable: { gte: MIN_PAYOUT_PAISE },
          user: { leftLegCount: { gt: 0 }, rightLegCount: { gt: 0 } },
        },
        select: { userId: true, balanceAvailable: true },
      });
      const payouts = wallets.map((w) => {
        const paid = Math.floor(w.balanceAvailable * PAY_RATIO);
        const forfeit = w.balanceAvailable - paid;
        totalPaid += paid;
        totalForfeit += forfeit;
        return {
          userId: w.userId,
          runDate,
          proMax: false,
          startBalance: w.balanceAvailable,
          paidAmount: paid,
          forfeitAmount: forfeit,
        };
      });
      if (payouts.length > 0) {
        const out = await tx.dailyPayout.createMany({ data: payouts, skipDuplicates: true });
        created += out.count;
      }
      const userIds = wallets.map((w) => w.userId);
      if (userIds.length > 0) {
        const reset = await tx.wallet.updateMany({
          where: { userId: { in: userIds } },
          data: { balanceAvailable: 0 },
        });
        resetCount += reset.count;
      }
      // The gated-points cache only feeds the 1000-pt engine.
      const cc = await tx.user.updateMany({
        where: { gatedPointsEarned: { gt: 0 } },
        data: { gatedPointsEarned: 0 },
      });
      cacheCleared = cc.count;
    }

    // ---- PIN PRO MAX wallet (proMaxBalanceAvailable) — same 90/10 cycle.
    // Pro Max rows carry proMax=true and share the runDate; the
    // @@unique([userId, runDate, proMax]) lets them coexist with standard rows.
    // GATE: only members who are themselves Pro Max (isProMax) are paid. A
    // non-Pro-Max upline accrues Pro Max points but they're held until that
    // member goes Pro Max — then their accrued balance pays out on the next run.
    if (doProMax) {
      const proMaxWallets = await tx.wallet.findMany({
        where: {
          proMaxBalanceAvailable: { gte: MIN_PAYOUT_PAISE },
          // Same both-legs-filled gate as the 1000-pt program, on the Pro Max
          // legs: at least one member on each Pro Max leg.
          user: {
            isProMax: true,
            proMaxLeftLegCount: { gt: 0 },
            proMaxRightLegCount: { gt: 0 },
          },
        },
        select: { userId: true, proMaxBalanceAvailable: true },
      });
      const proMaxPayouts = proMaxWallets.map((w) => {
        const paid = Math.floor(w.proMaxBalanceAvailable * PAY_RATIO);
        const forfeit = w.proMaxBalanceAvailable - paid;
        totalPaid += paid;
        totalForfeit += forfeit;
        return {
          userId: w.userId,
          runDate,
          proMax: true,
          startBalance: w.proMaxBalanceAvailable,
          paidAmount: paid,
          forfeitAmount: forfeit,
        };
      });
      if (proMaxPayouts.length > 0) {
        const out = await tx.dailyPayout.createMany({ data: proMaxPayouts, skipDuplicates: true });
        created += out.count;
      }
      const proMaxUserIds = proMaxWallets.map((w) => w.userId);
      if (proMaxUserIds.length > 0) {
        const reset = await tx.wallet.updateMany({
          where: { userId: { in: proMaxUserIds } },
          data: { proMaxBalanceAvailable: 0 },
        });
        resetCount += reset.count;
      }
    }

    // Only the nightly all-scope run advances the idempotency checkpoint.
    if (!force && scope === "all") {
      await tx.setting.upsert({
        where: { key: SETTING_KEY },
        update: { value: today },
        create: { key: SETTING_KEY, value: today },
      });
    }

    return { created, resetCount, cacheCleared, totalPaid, totalForfeit };
  });

  return {
    skipped: false,
    date: runDate,
    forced: force,
    scope,
    payoutsCreated: result.created,
    walletsReset: result.resetCount,
    gatedCacheCleared: result.cacheCleared,
    totalPaid: result.totalPaid,
    totalForfeit: result.totalForfeit,
  };
}

// Generate a runDate like "2026-05-23-test-1" that doesn't collide with any
// existing row for the same user. Repeated forced runs append -test-2, -3, …
async function nextTestRunDate(today: string): Promise<string> {
  for (let i = 1; i < 1000; i++) {
    const candidate = `${today}-test-${i}`;
    const exists = await prisma.dailyPayout.findFirst({
      where: { runDate: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `${today}-test-${Date.now()}`;
}
