// Run (preview):  npm run db:reverse-2000pt-credits
// Run (apply):    APPLY=1 npm run db:reverse-2000pt-credits
//
// A previous version auto-credited a 2000-pt pin's value to the NEWLY-ENROLLED
// member's payout wallet at registration. That behaviour was removed — the
// 2000-pt pin now follows the same points system as a 1000-pt pin, and its only
// difference is the 40 Combo Reward. This script removes those stale join
// credits.
//
// A member received the credit iff the pin used to enrol them was >= 2000 pts
// (Pin.usedForUserId + Pin.pointsValue). It reverses each pin's credit exactly
// once — decrement balanceAvailable by the pin value (never below 0) and write a
// JOIN_CREDIT_REVERSED audit log keyed to the pin id, so re-running is a no-op.
//
// Defaults to a DRY RUN. Set APPLY=1 to write changes.

import { prisma } from "../src/lib/db";
import { pointsToPaise, formatPoints } from "../src/lib/money";

const APPLY = process.env.APPLY === "1";

(async () => {
  console.log(APPLY ? "APPLYING changes.\n" : "DRY RUN — no changes written. Set APPLY=1 to apply.\n");

  const pins = await prisma.pin.findMany({
    where: { pointsValue: { gte: 2000 }, usedForUserId: { not: null } },
    select: { id: true, code: true, pointsValue: true, usedForUserId: true },
  });

  if (pins.length === 0) {
    console.log("No 2000-pt enrollment pins found — nothing to reverse.");
    return;
  }

  const alreadyReversed = await prisma.auditLog.findMany({
    where: { action: "JOIN_CREDIT_REVERSED" },
    select: { target: true },
  });
  const reversedPinIds = new Set(alreadyReversed.map((a) => a.target));

  let count = 0;
  let totalPoints = 0;

  for (const pin of pins) {
    if (reversedPinIds.has(pin.id)) {
      console.log(`• skip pin ${pin.code} — already reversed`);
      continue;
    }
    const userId = pin.usedForUserId!;
    const creditPaise = pointsToPaise(pin.pointsValue);
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { balanceAvailable: true },
    });
    const current = wallet?.balanceAvailable ?? 0;
    const newBalance = Math.max(0, current - creditPaise);

    console.log(
      `• user ${userId} (pin ${pin.code}, ${pin.pointsValue}pt): ` +
        `${formatPoints(current)} → ${formatPoints(newBalance)} ` +
        `(removing ${formatPoints(current - newBalance)})`,
    );

    if (APPLY) {
      await prisma.$transaction(async (tx) => {
        if (wallet) {
          await tx.wallet.update({ where: { userId }, data: { balanceAvailable: newBalance } });
        }
        await tx.auditLog.create({
          data: {
            actorId: "system",
            action: "JOIN_CREDIT_REVERSED",
            target: pin.id,
            metadata: JSON.stringify({
              userId,
              pinCode: pin.code,
              pointsValue: pin.pointsValue,
              removedPaise: current - newBalance,
            }),
          },
        });
      });
    }

    count++;
    totalPoints += pin.pointsValue;
  }

  console.log(
    `\n${APPLY ? "Reversed" : "Would reverse"} ${count} join credit(s), ` +
      `${totalPoints.toLocaleString("en-IN")} pts total.`,
  );
  if (!APPLY && count > 0) console.log("Re-run with APPLY=1 to apply.");
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
