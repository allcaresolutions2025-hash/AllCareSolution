// Run via: npm run db:diagnose-2000
//
// Read-only. For every user that either has a non-zero payout balance, was
// enrolled with a 2000-pt pin, or carries an old purchaser-reward credit, prints
// where their points came from. Use this to see why an account shows 2000 pts
// and/or the "40 Combo Reward" card.
//
//   enrolledWith  = value of the pin USED TO ENROLL this user. If 2000, they are
//                   *correctly* credited 2000 and shown the combo card — the
//                   credit follows being enrolled, not enrolling others.
//   oldReward     = a stale credit from the removed purchaser-reward flow
//                   (AuditLog PIN_REWARD_APPROVED). Should be reversed via
//                   `npm run db:reverse-pin-reward-credits`.

import { prisma } from "../src/lib/db";
import { formatPoints } from "../src/lib/money";

(async () => {
  // Users enrolled with a 2000-pt pin (legit 2000 + combo).
  const enroll2000 = await prisma.pin.findMany({
    where: { pointsValue: { gte: 2000 }, usedForUserId: { not: null } },
    select: { usedForUserId: true, pointsValue: true },
  });
  const enrolledWith = new Map(enroll2000.map((p) => [p.usedForUserId!, p.pointsValue]));

  // Stale purchaser credits from the old flow.
  const oldApprovals = await prisma.auditLog.findMany({
    where: { action: "PIN_REWARD_APPROVED" },
    select: { metadata: true },
  });
  const reversedLogs = await prisma.auditLog.findMany({
    where: { action: "PIN_REWARD_REVERSED" },
    select: { metadata: true },
  });
  const oldReward = new Map<string, number>();
  for (const a of oldApprovals) {
    try {
      const m = a.metadata ? JSON.parse(a.metadata) : {};
      if (m.userId && m.points) oldReward.set(m.userId, (oldReward.get(m.userId) ?? 0) + m.points);
    } catch {}
  }
  const reversedCount = reversedLogs.length;

  const candidateIds = new Set<string>([...enrolledWith.keys(), ...oldReward.keys()]);
  const wallets = await prisma.wallet.findMany({
    where: { balanceAvailable: { gt: 0 } },
    select: { userId: true },
  });
  wallets.forEach((w) => candidateIds.add(w.userId));

  const users = await prisma.user.findMany({
    where: { id: { in: [...candidateIds] } },
    select: { id: true, name: true, referralCode: true, wallet: { select: { balanceAvailable: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n${users.length} account(s) with points / 2000-pt enrollment / old credit:\n`);
  for (const u of users) {
    const bal = u.wallet?.balanceAvailable ?? 0;
    const ew = enrolledWith.get(u.id);
    const old = oldReward.get(u.id);
    console.log(
      `${u.referralCode.padEnd(12)} ${u.name.slice(0, 20).padEnd(22)} ` +
        `balance=${formatPoints(bal).padStart(12)}  ` +
        `enrolledWith=${ew ? ew + "pt (legit 2000+combo)" : "—".padEnd(8)}  ` +
        `${old ? `oldReward=${old}pt (STALE — reverse)` : ""}`,
    );
  }
  console.log(
    `\nStale purchaser credits still present: ${oldReward.size} user(s); already reversed: ${reversedCount}.`,
  );
  console.log("If any row shows oldReward, run: npm run db:reverse-pin-reward-credits\n");
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
