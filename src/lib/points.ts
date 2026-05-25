// Real-time points engine for the binary tree.
//
// Rules (in order applied when a new joiner N is inserted):
//
//   RULE 1 — Direct referral bonus (+200)
//     Credited to the PIN owner — the user who bought the PIN consumed to
//     create N. Paid immediately, regardless of whether N is placed
//     directly below the PIN owner or deeper (e.g., as a grandchild via
//     spillover or explicit selection).
//
//   RULE 2 — First-pair bonus (+500)
//     The placement parent (the user immediately above N in the tree) gets
//     a one-time +500 the moment their LEFT and RIGHT direct slots are
//     first both filled. Tracked via User.pairBonusAwarded so it pays once
//     per user, regardless of who bought the PIN.
//
//   RULE 3 — Pair-match cascade (uplines, +200 / +100)
//     For every ancestor strictly ABOVE the placement parent, N adds 1 to
//     that ancestor's leftLegCount or rightLegCount (depending on which
//     side of the ancestor N's branch sits on). If this increment grows
//     the ancestor's min(L, R), the ancestor earns one pair match:
//        - +200 when the ancestor sits within 15 levels of N (depth ≤ 15)
//        - +100 when the ancestor is 16+ levels above N
//
// All points are stored as paise in Wallet.balanceAvailable
// (1 point = PAISE_PER_POINT from src/lib/money.ts).
// Leg sizes are cached on User.leftLegCount / User.rightLegCount.

import { Prisma, PrismaClient, Slot } from "@prisma/client";
import { PAISE_PER_POINT } from "./money";

// Award scale: every engine event credits a multiple of 100 display points so
// "1 referral = 200 pts" reads naturally. If you ever need to tune the spread,
// keep the ratio (2 : 5 : 2 : 1) or update all four together.
export const POINTS_PER_DIRECT_REFERRAL = 200;
export const FIRST_PAIR_BONUS = 500;
export const PAIR_MATCH_POINTS_NEAR = 200;   // for ancestors ≤15 levels above the joiner
export const PAIR_MATCH_POINTS_FAR = 100;    // for ancestors 16+ levels above the joiner
export const PAIR_MATCH_DEPTH_THRESHOLD = 15;

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Award points triggered by a newly-added user.
 * Caller is responsible for opening the transaction.
 *
 * @param pinOwnerId - The user who bought the PIN used to create newUserId.
 *   Receives the +200 direct-referral bonus (Rule 1). Defaults to the
 *   placement parent when omitted (back-compat for callers without a PIN).
 */
export async function awardUplinePoints(
  tx: Tx,
  newUserId: string,
  pinOwnerId?: string,
): Promise<void> {
  const newUser = await tx.user.findUnique({
    where: { id: newUserId },
    select: { referrerId: true, slot: true },
  });
  if (!newUser?.referrerId || !newUser.slot) return;

  const directPaise = POINTS_PER_DIRECT_REFERRAL * PAISE_PER_POINT;
  const firstPairPaise = FIRST_PAIR_BONUS * PAISE_PER_POINT;
  const nearPaise = PAIR_MATCH_POINTS_NEAR * PAISE_PER_POINT;
  const farPaise = PAIR_MATCH_POINTS_FAR * PAISE_PER_POINT;

  // RULE 1 — PIN owner gets +200 immediately for every PIN-sponsored signup,
  // whether the new joiner is placed directly below the PIN owner or deeper
  // (e.g., as a grandchild).
  const directBeneficiaryId = pinOwnerId ?? newUser.referrerId;
  await tx.wallet.upsert({
    where: { userId: directBeneficiaryId },
    create: { userId: directBeneficiaryId, balanceAvailable: directPaise },
    update: { balanceAvailable: { increment: directPaise } },
  });

  // Walk up the upline chain. For each ancestor:
  //   - bump leg counts based on which side of the ancestor the joiner is on,
  //   - direct parent: check Rule 2 (first-pair bonus),
  //   - indirect ancestor: check Rule 3 (pair-match cascade).
  let ancestorId: string | null = newUser.referrerId;
  let slotFromBelow: Slot = newUser.slot;
  let isDirectParent = true;
  // depth = number of levels from the current ancestor down to the new joiner.
  // Direct parent is depth 1; depth 2 = grandparent; etc.
  let depth = 1;
  let safety = 0;

  while (ancestorId && safety++ < 1000) {
    const ancestor: {
      id: string;
      referrerId: string | null;
      slot: Slot | null;
      leftLegCount: number;
      rightLegCount: number;
      pairBonusAwarded: boolean;
    } | null = await tx.user.findUnique({
      where: { id: ancestorId },
      select: {
        id: true,
        referrerId: true,
        slot: true,
        leftLegCount: true,
        rightLegCount: true,
        pairBonusAwarded: true,
      },
    });
    if (!ancestor) break;

    const oldL = ancestor.leftLegCount;
    const oldR = ancestor.rightLegCount;
    const isLeftSide = slotFromBelow === "LEFT";
    const newL = isLeftSide ? oldL + 1 : oldL;
    const newR = isLeftSide ? oldR : oldR + 1;
    const oldMin = Math.min(oldL, oldR);
    const newMin = Math.min(newL, newR);

    // Persist the cached leg count change.
    await tx.user.update({
      where: { id: ancestor.id },
      data: isLeftSide
        ? { leftLegCount: { increment: 1 } }
        : { rightLegCount: { increment: 1 } },
    });

    if (isDirectParent) {
      // RULE 2 — first-pair bonus. Newer leg counts already reflect the addition.
      if (!ancestor.pairBonusAwarded && newL > 0 && newR > 0) {
        await tx.wallet.update({
          where: { userId: ancestor.id },
          data: { balanceAvailable: { increment: firstPairPaise } },
        });
        await tx.user.update({
          where: { id: ancestor.id },
          data: { pairBonusAwarded: true },
        });
      }
    } else {
      // RULE 3 — pair-match cascade. Only triggers when the SHORTER leg grew.
      const delta = newMin - oldMin;
      if (delta > 0) {
        const matchPaise = depth <= PAIR_MATCH_DEPTH_THRESHOLD ? nearPaise : farPaise;
        await tx.wallet.upsert({
          where: { userId: ancestor.id },
          create: { userId: ancestor.id, balanceAvailable: delta * matchPaise },
          update: { balanceAvailable: { increment: delta * matchPaise } },
        });
      }
    }

    // Move up one level. The next ancestor sees this node's own slot as the
    // "side from below" — that determines which leg of the next ancestor grows.
    if (!ancestor.referrerId || !ancestor.slot) break;
    slotFromBelow = ancestor.slot;
    ancestorId = ancestor.referrerId;
    isDirectParent = false;
    depth++;
  }
}
