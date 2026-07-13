// Run via: npm run db:reverse-pin-reward-credits
//
// One-off cleanup. An earlier version of the 2000-pt pin feature (commit
// 122b3c1) credited the PURCHASER's payout wallet when an admin approved their
// "pin reward" claim. That behaviour was replaced: the 2000 pts now go to the
// newly-enrolled member instead, so any purchaser credit from the old flow is
// stale and must be reversed.
//
// Each old credit left an AuditLog { action: "PIN_REWARD_APPROVED",
// metadata: { userId, points } }. This script reverses each one exactly once —
// it decrements the user's balanceAvailable (never below 0) and writes a
// PIN_REWARD_REVERSED audit log so re-running is a safe no-op.

import { prisma } from "../src/lib/db";
import { pointsToPaise, formatPoints } from "../src/lib/money";

(async () => {
  const approvals = await prisma.auditLog.findMany({
    where: { action: "PIN_REWARD_APPROVED" },
    orderBy: { createdAt: "asc" },
  });

  if (approvals.length === 0) {
    console.log("No PIN_REWARD_APPROVED credits found — nothing to reverse.");
    return;
  }

  // Which ones have already been reversed (idempotency).
  const reversed = await prisma.auditLog.findMany({
    where: { action: "PIN_REWARD_REVERSED" },
    select: { target: true },
  });
  const reversedTargets = new Set(reversed.map((r) => r.target));

  let reversedCount = 0;
  let totalPointsReversed = 0;

  for (const a of approvals) {
    if (a.target && reversedTargets.has(a.target)) {
      console.log(`• skip ${a.target} — already reversed`);
      continue;
    }
    let meta: { userId?: string; points?: number } = {};
    try {
      meta = a.metadata ? JSON.parse(a.metadata) : {};
    } catch {
      console.warn(`• skip ${a.id} — unparseable metadata`);
      continue;
    }
    if (!meta.userId || !meta.points) {
      console.warn(`• skip ${a.id} — missing userId/points in metadata`);
      continue;
    }

    const amountPaise = pointsToPaise(meta.points);

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId: meta.userId! },
        select: { balanceAvailable: true },
      });
      const current = wallet?.balanceAvailable ?? 0;
      const newBalance = Math.max(0, current - amountPaise);
      if (wallet) {
        await tx.wallet.update({
          where: { userId: meta.userId! },
          data: { balanceAvailable: newBalance },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: a.actorId,
          action: "PIN_REWARD_REVERSED",
          target: a.target,
          metadata: JSON.stringify({
            userId: meta.userId,
            points: meta.points,
            removedPaise: current - newBalance,
            reversedApproval: a.id,
          }),
        },
      });
      console.log(
        `• reversed ${formatPoints(amountPaise)} for user ${meta.userId} ` +
          `(balance ${formatPoints(current)} → ${formatPoints(newBalance)})`,
      );
    });

    reversedCount++;
    totalPointsReversed += meta.points;
  }

  console.log(
    `\nDone. Reversed ${reversedCount} old purchaser credit(s), ` +
      `${totalPointsReversed.toLocaleString("en-IN")} pts total.`,
  );
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
