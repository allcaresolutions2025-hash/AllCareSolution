// AF Solution package engine — product packages that earn binary income from
// BV on the AF tree (User.afReferrerId / afSlot). AF accounts are separate
// logins; see src/lib/af.ts for how they are created.
//
// Flow:
//   1. A member requests a package (Starter = fixed points, or a custom
//      amount >= the minimum) and picks the product they'll receive. No
//      payment is taken in the app. Status PENDING.
//   2. An admin verifies the request and approves. The package's BV
//      (points x PKG_BV_PERCENT) is added to the LEFT/RIGHT leg of every
//      ancestor on the AF tree (User.afReferrerId / afSlot), as FIFO lots in
//      PackageBvEntry. The placement parent, if active, gets a one-time DIRECT
//      bonus of PKG_DIRECT_PERCENT of the BV.
//   3. In the same transaction, settleMatching() pays the buyer and every
//      ancestor that is ACTIVE PKG_BINARY_PERCENT of min(leftBv, rightBv),
//      consumes that BV from both legs, and carries the rest forward. Limits:
//        - daily cap: binary income per IST day <= PKG_DAILY_CAP_MULTIPLIER x
//          member's package total (matched BV above the cap is flushed);
//        - payout ceiling: total DIRECT + BINARY over a rolling 30 days stays
//          within PKG_PAYOUT_CEILING_PERCENT of package points approved in the
//          same window — if a settlement would exceed it, everyone in it is
//          scaled down proportionally.
//   4. Each night runPackageMatching() lapses carry-forward lots older than
//      PKG_CARRY_EXPIRY_DAYS and settles anything still outstanding.
//
// There is no fixed/guaranteed return on the package points. Every point paid
// out comes from BV that approved packages created.
//
// Units: amounts are paise (see lib/money.ts). BV is whole units, 1 BV = 1
// point of income base, so income paise = BV x percent.

import { Prisma, Slot } from "@prisma/client";
import { prisma } from "./db";
import { getAllBusinessSettings } from "./settings";
import { istDateString } from "./daily-payout";
import { PAISE_PER_POINT } from "./money";

type Tx = Prisma.TransactionClient;

const CHECKPOINT_KEY = "package_matching_last_run_ist_date";
const CEILING_WINDOW_DAYS = 30;
const MAX_TREE_DEPTH = 1000;
// pg advisory lock id held while matching is settled.
const MATCHING_LOCK_KEY = 724_001;

export type PackageConfig = {
  starterPoints: number;
  minPoints: number;
  bvPercent: number;
  directPercent: number;
  binaryPercent: number;
  dailyCapMultiplier: number;
  carryExpiryDays: number;
  payoutCeilingPercent: number;
};

export async function getPackageConfig(): Promise<PackageConfig> {
  const s = await getAllBusinessSettings();
  return {
    starterPoints: s.PKG_STARTER_POINTS,
    minPoints: s.PKG_MIN_POINTS,
    bvPercent: s.PKG_BV_PERCENT,
    directPercent: s.PKG_DIRECT_PERCENT,
    binaryPercent: s.PKG_BINARY_PERCENT,
    dailyCapMultiplier: s.PKG_DAILY_CAP_MULTIPLIER,
    carryExpiryDays: s.PKG_CARRY_EXPIRY_DAYS,
    payoutCeilingPercent: s.PKG_PAYOUT_CEILING_PERCENT,
  };
}

export function bvForAmount(amountPaise: number, bvPercent: number): number {
  return Math.floor(((amountPaise / PAISE_PER_POINT) * bvPercent) / 100);
}

/** Income in paise for `bv` at `percent` (1 BV = 1 point = 100 paise). */
function incomeForBv(bv: number, percent: number): number {
  return Math.floor((bv * PAISE_PER_POINT * percent) / 100);
}

type ChainRow = { id: string; afReferrerId: string | null; afSlot: Slot | null; depth: number };

/**
 * Ancestors of `userId` on the AF tree, nearest first, each tagged with the
 * side of that ancestor the user's branch sits on.
 */
async function getAncestorSides(tx: Tx, userId: string): Promise<{ userId: string; side: Slot }[]> {
  const rows = await tx.$queryRaw<ChainRow[]>`
    WITH RECURSIVE up AS (
      SELECT id, "afReferrerId", "afSlot", 0 AS depth FROM "User" WHERE id = ${userId}
      UNION ALL
      SELECT p.id, p."afReferrerId", p."afSlot", up.depth + 1
      FROM "User" p JOIN up ON p.id = up."afReferrerId"
      WHERE up.depth < ${MAX_TREE_DEPTH}
    )
    SELECT id, "afReferrerId", "afSlot", depth FROM up ORDER BY depth ASC
  `;
  const out: { userId: string; side: Slot }[] = [];
  for (let i = 1; i < rows.length; i++) {
    // The side is decided by the node directly below.
    const below = rows[i - 1];
    if (!below.afSlot) break;
    out.push({ userId: rows[i].id, side: below.afSlot });
  }
  return out;
}

export class PackageError extends Error {}

/** Approve a PENDING package: activate the buyer, push BV up, pay DIRECT and matching. */
export async function approvePackagePurchase(purchaseId: string, reviewerId: string, note: string | null) {
  const cfg = await getPackageConfig();

  return prisma.$transaction(
    async (tx) => {
      await lockMatching(tx);
      const purchase = await tx.packagePurchase.findUnique({ where: { id: purchaseId } });
      if (!purchase) throw new PackageError("Package request not found.");

      // Conditional status flip guards against a double approve.
      const flipped = await tx.packagePurchase.updateMany({
        where: { id: purchaseId, status: "PENDING" },
        data: { status: "APPROVED", reviewerId, reviewedAt: new Date(), adminNote: note },
      });
      if (flipped.count === 0) throw new PackageError("This request has already been reviewed.");

      if (purchase.productId) {
        const stock = await tx.product.updateMany({
          where: { id: purchase.productId, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } },
        });
        if (stock.count === 0) {
          throw new PackageError(`${purchase.productName} is out of stock — restock it or reject the request.`);
        }
      }

      await tx.packageAccount.upsert({
        where: { userId: purchase.userId },
        create: {
          userId: purchase.userId,
          active: true,
          packageTotal: purchase.amount,
          personalBv: purchase.bv,
        },
        update: {
          active: true,
          packageTotal: { increment: purchase.amount },
          personalBv: { increment: purchase.bv },
        },
      });

      const ancestors = await getAncestorSides(tx, purchase.userId);
      if (ancestors.length > 0 && purchase.bv > 0) {
        await tx.packageAccount.createMany({
          data: ancestors.map((a) => ({ userId: a.userId })),
          skipDuplicates: true,
        });
        const leftIds = ancestors.filter((a) => a.side === "LEFT").map((a) => a.userId);
        const rightIds = ancestors.filter((a) => a.side === "RIGHT").map((a) => a.userId);
        if (leftIds.length > 0) {
          await tx.packageAccount.updateMany({
            where: { userId: { in: leftIds } },
            data: { leftBv: { increment: purchase.bv }, leftBvTotal: { increment: purchase.bv } },
          });
        }
        if (rightIds.length > 0) {
          await tx.packageAccount.updateMany({
            where: { userId: { in: rightIds } },
            data: { rightBv: { increment: purchase.bv }, rightBvTotal: { increment: purchase.bv } },
          });
        }
        await tx.packageBvEntry.createMany({
          data: ancestors.map((a) => ({
            userId: a.userId,
            side: a.side,
            bv: purchase.bv,
            remaining: purchase.bv,
            purchaseId: purchase.id,
          })),
        });
      }

      // DIRECT bonus — placement parent only, and only while they hold a package.
      let directPaid = 0;
      const parentId = ancestors[0]?.userId;
      if (parentId) {
        const parent = await tx.packageAccount.findUnique({
          where: { userId: parentId },
          select: { active: true },
        });
        const bonus = incomeForBv(purchase.bv, cfg.directPercent);
        if (parent?.active && bonus > 0) {
          await tx.packageAccount.update({
            where: { userId: parentId },
            data: { walletBalance: { increment: bonus }, earnedLifetime: { increment: bonus } },
          });
          await tx.packageEarning.create({
            data: {
              userId: parentId,
              type: "DIRECT",
              amount: bonus,
              grossAmount: bonus,
              purchaseId: purchase.id,
              note: `${cfg.directPercent}% of ${purchase.bv} BV from a direct member's package`,
            },
          });
          await tx.notification.create({
            data: {
              userId: parentId,
              title: "Package direct bonus",
              body: `You earned ${bonus / PAISE_PER_POINT} pts because an AF account directly below you activated a package.`,
            },
          });
          directPaid = bonus;
        }
      }

      // Pair matching, paid now rather than overnight. The buyer is included:
      // BV that reached them while they had no package matches once active.
      const matching = await settleMatching(tx, cfg, [purchase.userId, ...ancestors.map((a) => a.userId)]);

      await tx.notification.create({
        data: {
          userId: purchase.userId,
          title: "Package approved",
          body: `Your ${purchase.amount / PAISE_PER_POINT}-pt package is active (${purchase.bv} BV). ${purchase.productName} will be shipped to you soon.`,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: "PACKAGE_APPROVED",
          target: purchase.id,
          metadata: JSON.stringify({
            userId: purchase.userId,
            amount: purchase.amount,
            bv: purchase.bv,
            ancestors: ancestors.length,
            directPaid,
            matchingPaid: matching.totalPaid,
            membersMatched: matching.membersMatched,
            note,
          }),
        },
      });

      return {
        bv: purchase.bv,
        ancestors: ancestors.length,
        directPaid,
        matchingPaid: matching.totalPaid,
        membersMatched: matching.membersMatched,
      };
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
}

/** Reject a PENDING package. */
export async function rejectPackagePurchase(purchaseId: string, reviewerId: string, note: string | null) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.packagePurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) throw new PackageError("Package request not found.");
    const flipped = await tx.packagePurchase.updateMany({
      where: { id: purchaseId, status: "PENDING" },
      data: { status: "REJECTED", reviewerId, reviewedAt: new Date(), adminNote: note },
    });
    if (flipped.count === 0) throw new PackageError("This request has already been reviewed.");

    await tx.notification.create({
      data: {
        userId: purchase.userId,
        title: "Package request declined",
        body: note
          ? `Your package request was declined. Reason: ${note}`
          : "Your package request was declined. Please contact support for details.",
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: reviewerId,
        action: "PACKAGE_REJECTED",
        target: purchase.id,
        metadata: JSON.stringify({ userId: purchase.userId, amount: purchase.amount, note }),
      },
    });
  });
}

export type PackageMatchingResult = {
  skipped: boolean;
  date: string;
  expiredBv?: number;
} & Partial<MatchingSettlement>;

type MatchingSettlement = {
  membersMatched: number;
  bvMatched: number;
  grossIncome: number;
  totalPaid: number;
  scaleFactor: number;
  ceilingPool: number;
};

/**
 * Pay binary matching now to every active account in `userIds` (or all
 * accounts) holding unmatched BV on both legs. Runs inside the caller's
 * transaction, which must hold MATCHING_LOCK_KEY so two settlements never
 * read the same ceiling pool or BV. Re-running is harmless: matched BV is
 * consumed in the same transaction that pays it.
 */
async function settleMatching(tx: Tx, cfg: PackageConfig, userIds: string[] | "all"): Promise<MatchingSettlement> {
  const today = istDateString();
  const empty = { membersMatched: 0, bvMatched: 0, grossIncome: 0, totalPaid: 0, scaleFactor: 1, ceilingPool: 0 };
  if (userIds !== "all" && userIds.length === 0) return empty;

  const accounts = await tx.$queryRaw<{ userId: string; leftBv: number; rightBv: number; packageTotal: number }[]>`
    SELECT "userId", "leftBv", "rightBv", "packageTotal" FROM "PackageAccount"
    WHERE active AND "leftBv" > 0 AND "rightBv" > 0
    ${userIds === "all" ? Prisma.empty : Prisma.sql`AND "userId" IN (${Prisma.join(userIds)})`}
    FOR UPDATE
  `;
  if (accounts.length === 0) return empty;

  // Daily cap: binary income already paid today counts against it.
  const paidToday = await tx.packageEarning.groupBy({
    by: ["userId"],
    where: { type: "BINARY", runDate: today, userId: { in: accounts.map((a) => a.userId) } },
    _sum: { amount: true },
  });
  const paidTodayByUser = new Map(paidToday.map((r) => [r.userId, r._sum.amount ?? 0]));

  const plans = accounts.map((a) => {
    const matched = Math.min(a.leftBv, a.rightBv);
    const gross = incomeForBv(matched, cfg.binaryPercent);
    const capLeft = Math.max(0, Math.floor(a.packageTotal * cfg.dailyCapMultiplier) - (paidTodayByUser.get(a.userId) ?? 0));
    return { userId: a.userId, matched, gross, capped: Math.min(gross, capLeft) };
  });

  // Payout ceiling over the rolling window, shared proportionally.
  const since = new Date(Date.now() - CEILING_WINDOW_DAYS * 86_400_000);
  const [revenue, paid] = await Promise.all([
    tx.packagePurchase.aggregate({
      where: { status: "APPROVED", reviewedAt: { gte: since } },
      _sum: { amount: true },
    }),
    tx.packageEarning.aggregate({
      where: { type: { in: ["DIRECT", "BINARY"] }, createdAt: { gte: since } },
      _sum: { amount: true },
    }),
  ]);
  const ceilingPool = Math.max(
    0,
    Math.floor(((revenue._sum.amount ?? 0) * cfg.payoutCeilingPercent) / 100) - (paid._sum.amount ?? 0),
  );
  const totalCapped = plans.reduce((sum, p) => sum + p.capped, 0);
  const scaleFactor = totalCapped > ceilingPool ? ceilingPool / totalCapped : 1;

  let bvMatched = 0;
  let grossIncome = 0;
  let totalPaid = 0;
  for (const p of plans) {
    const amount = Math.floor(p.capped * scaleFactor);
    const notes: string[] = [`${cfg.binaryPercent}% of ${p.matched} matched BV`];
    if (p.capped < p.gross) notes.push("daily cap applied");
    if (scaleFactor < 1) notes.push(`payout ceiling: scaled to ${(scaleFactor * 100).toFixed(1)}%`);
    await tx.packageEarning.create({
      data: {
        userId: p.userId,
        type: "BINARY",
        amount,
        grossAmount: p.gross,
        bvMatched: p.matched,
        runDate: today,
        note: notes.join(" · "),
      },
    });
    await consumeBv(tx, p.userId, "LEFT", p.matched);
    await consumeBv(tx, p.userId, "RIGHT", p.matched);
    await tx.packageAccount.update({
      where: { userId: p.userId },
      data: {
        leftBv: { decrement: p.matched },
        rightBv: { decrement: p.matched },
        walletBalance: { increment: amount },
        earnedLifetime: { increment: amount },
      },
    });
    bvMatched += p.matched;
    grossIncome += p.gross;
    totalPaid += amount;
  }

  const notified = plans.filter((p) => Math.floor(p.capped * scaleFactor) > 0);
  if (notified.length > 0) {
    await tx.notification.createMany({
      data: notified.map((p) => ({
        userId: p.userId,
        title: "Pair matching income",
        body: `You earned ${Math.floor(p.capped * scaleFactor) / PAISE_PER_POINT} pts from ${p.matched} matched BV.`,
      })),
    });
  }

  return { membersMatched: plans.length, bvMatched, grossIncome, totalPaid, scaleFactor, ceilingPool };
}

/**
 * Nightly housekeeping, once per IST date: lapse expired carry-forward lots,
 * then settle any matching still outstanding. Matching is normally paid
 * instantly on package approval, so the second step is a catch-up.
 */
export async function runPackageMatching(): Promise<PackageMatchingResult> {
  const today = istDateString();
  const last = await prisma.setting.findUnique({ where: { key: CHECKPOINT_KEY } });
  if (last?.value === today) return { skipped: true, date: today };

  const cfg = await getPackageConfig();
  const now = new Date();

  // ---- 1. Lapse expired carry-forward lots.
  const cutoff = new Date(now.getTime() - cfg.carryExpiryDays * 86_400_000);
  const expiredBv = await prisma.$transaction(async (tx) => {
    const where = { remaining: { gt: 0 }, createdAt: { lt: cutoff } };
    const groups = await tx.packageBvEntry.groupBy({
      by: ["userId", "side"],
      where,
      _sum: { remaining: true },
    });
    if (groups.length === 0) return 0;
    await tx.packageBvEntry.updateMany({ where, data: { remaining: 0 } });
    let total = 0;
    for (const g of groups) {
      const bv = g._sum.remaining ?? 0;
      total += bv;
      await tx.packageAccount.update({
        where: { userId: g.userId },
        data: g.side === "LEFT" ? { leftBv: { decrement: bv } } : { rightBv: { decrement: bv } },
      });
    }
    return total;
  }, { maxWait: 10_000, timeout: 60_000 });

  // ---- 2. Catch-up matching.
  const settlement = await prisma.$transaction(
    async (tx) => {
      await lockMatching(tx);
      return settleMatching(tx, cfg, "all");
    },
    { maxWait: 30_000, timeout: 300_000 },
  );

  await prisma.setting.upsert({
    where: { key: CHECKPOINT_KEY },
    update: { value: today },
    create: { key: CHECKPOINT_KEY, value: today },
  });

  return { skipped: false, date: today, expiredBv, ...settlement };
}

/** Serialise matching settlements (package approvals and the nightly run). */
async function lockMatching(tx: Tx) {
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${MATCHING_LOCK_KEY})`);
}

/** Take `amount` BV from the oldest lots on one leg (FIFO), in one statement. */
async function consumeBv(tx: Tx, userId: string, side: Slot, amount: number) {
  if (amount <= 0) return;
  await tx.$executeRaw`
    WITH lots AS (
      SELECT id, remaining,
             SUM(remaining) OVER (ORDER BY "createdAt", id) AS cum
      FROM "PackageBvEntry"
      WHERE "userId" = ${userId} AND side = ${side}::"Slot" AND remaining > 0
    )
    UPDATE "PackageBvEntry" e
    SET remaining = CASE WHEN l.cum <= ${amount} THEN 0 ELSE (l.cum - ${amount})::int END
    FROM lots l
    WHERE e.id = l.id AND l.cum - l.remaining < ${amount}
  `;
}

export async function getLastMatchingRunDate(): Promise<string | null> {
  const last = await prisma.setting.findUnique({ where: { key: CHECKPOINT_KEY } });
  return last?.value ?? null;
}
