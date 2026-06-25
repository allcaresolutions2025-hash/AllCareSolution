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
  payoutsCreated?: number;
  walletsReset?: number;
  gatedCacheCleared?: number;
  totalPaid?: number;
  totalForfeit?: number;
};

export async function runDailyPayout(opts: { force?: boolean } = {}): Promise<DailyPayoutResult> {
  const force = opts.force ?? false;
  const today = istDateString();

  if (!force) {
    const last = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (last?.value === today) {
      return { skipped: true, date: today, forced: false };
    }
  }

  // For forced (test) runs, derive a unique synthetic runDate so we don't
  // clash with the real-day idempotency key on DailyPayout.
  const runDate = force ? await nextTestRunDate(today) : today;

  const result = await prisma.$transaction(async (tx) => {
    const wallets = await tx.wallet.findMany({
      where: { balanceAvailable: { gte: MIN_PAYOUT_PAISE } },
      select: { userId: true, balanceAvailable: true },
    });

    let totalPaid = 0;
    let totalForfeit = 0;
    const payouts = wallets.map((w) => {
      const paid = Math.floor(w.balanceAvailable * PAY_RATIO);
      const forfeit = w.balanceAvailable - paid;
      totalPaid += paid;
      totalForfeit += forfeit;
      return {
        userId: w.userId,
        runDate,
        startBalance: w.balanceAvailable,
        paidAmount: paid,
        forfeitAmount: forfeit,
      };
    });

    let created = 0;
    if (payouts.length > 0) {
      const out = await tx.dailyPayout.createMany({ data: payouts, skipDuplicates: true });
      created = out.count;
    }

    const userIds = wallets.map((w) => w.userId);
    const reset = userIds.length === 0
      ? { count: 0 }
      : await tx.wallet.updateMany({
          where: { userId: { in: userIds } },
          data: { balanceAvailable: 0 },
        });

    const cacheCleared = await tx.user.updateMany({
      where: { gatedPointsEarned: { gt: 0 } },
      data: { gatedPointsEarned: 0 },
    });

    // ---- PIN PRO MAX wallet — same nightly 90/10 cycle, tracked separately.
    // Pro Max payout rows carry proMax=true and share the same runDate; the
    // @@unique([userId, runDate, proMax]) lets them coexist with standard rows.
    const proMaxWallets = await tx.wallet.findMany({
      where: { proMaxBalanceAvailable: { gte: MIN_PAYOUT_PAISE } },
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
      await tx.wallet.updateMany({
        where: { userId: { in: proMaxUserIds } },
        data: { proMaxBalanceAvailable: 0 },
      });
    }

    if (!force) {
      await tx.setting.upsert({
        where: { key: SETTING_KEY },
        update: { value: today },
        create: { key: SETTING_KEY, value: today },
      });
    }

    return { created, resetCount: reset.count, cacheCleared: cacheCleared.count, totalPaid, totalForfeit };
  });

  return {
    skipped: false,
    date: runDate,
    forced: force,
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
