// Real-time points engine for the binary tree.
//
// Rules (in order applied when a new joiner N is inserted):
//
//   RULE 1 — Direct referral bonus (+200)
//     Credited to the PIN owner — the user who bought the PIN consumed to
//     create N. Two sub-cases:
//
//     1a. PIN owner == placement parent (the most common case: signup goes
//         directly under the PIN owner). The +200 is paid immediately.
//
//     1b. PIN owner != placement parent (PIN owner placed N as a grandchild
//         or deeper). The +200 is HELD on the PIN owner's pinSponsorHeldLeft
//         or pinSponsorHeldRight counter, depending on which side of the
//         PIN owner N descends from. Once the PIN owner first has at least
//         one PIN-sponsored descendant on BOTH sides, all held bonuses are
//         paid out at once, pinSponsorPairFormed flips to true, and from
//         then on every subsequent PIN-sponsored placement pays +200 to
//         the PIN owner immediately.
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
 *   Receives the +200 direct-referral bonus (Rule 1). When omitted, the
 *   placement parent is treated as the PIN owner (back-compat for callers
 *   without a PIN context).
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

  const effectivePinOwnerId = pinOwnerId ?? newUser.referrerId;
  const pinOwnerIsPlacementParent = effectivePinOwnerId === newUser.referrerId;

  // RULE 1a — PIN owner is the placement parent: pay +200 immediately.
  // The deeper case (1b) is handled inside the upline walk when we reach
  // the PIN-owner ancestor, because that's where we know which side of
  // the PIN owner the new joiner descends from.
  if (pinOwnerIsPlacementParent) {
    await tx.wallet.upsert({
      where: { userId: effectivePinOwnerId },
      create: { userId: effectivePinOwnerId, balanceAvailable: directPaise },
      update: { balanceAvailable: { increment: directPaise } },
    });
  }

  // Walk up the upline chain. For each ancestor:
  //   - bump leg counts based on which side of the ancestor the joiner is on,
  //   - direct parent: check Rule 2 (first-pair bonus),
  //   - indirect ancestor: check Rule 3 (pair-match cascade),
  //   - PIN-owner ancestor (deep-placement case): check Rule 1b held/pair logic.
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
      pinSponsorPairFormed: boolean;
      pinSponsorHeldLeft: number;
      pinSponsorHeldRight: number;
    } | null = await tx.user.findUnique({
      where: { id: ancestorId },
      select: {
        id: true,
        referrerId: true,
        slot: true,
        leftLegCount: true,
        rightLegCount: true,
        pairBonusAwarded: true,
        pinSponsorPairFormed: true,
        pinSponsorHeldLeft: true,
        pinSponsorHeldRight: true,
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

    // RULE 1b — PIN owner is somewhere up the chain (not the placement parent).
    // This ancestor IS the PIN owner: handle held/pair logic for the +200.
    if (!pinOwnerIsPlacementParent && ancestor.id === effectivePinOwnerId) {
      if (ancestor.pinSponsorPairFormed) {
        // Pair already formed in the past — pay +200 immediately.
        await tx.wallet.upsert({
          where: { userId: ancestor.id },
          create: { userId: ancestor.id, balanceAvailable: directPaise },
          update: { balanceAvailable: { increment: directPaise } },
        });
      } else {
        const newHeldLeft = ancestor.pinSponsorHeldLeft + (isLeftSide ? 1 : 0);
        const newHeldRight = ancestor.pinSponsorHeldRight + (isLeftSide ? 0 : 1);
        if (newHeldLeft > 0 && newHeldRight > 0) {
          // First pair just formed — release all held bonuses at once.
          const payout = (newHeldLeft + newHeldRight) * directPaise;
          await tx.wallet.upsert({
            where: { userId: ancestor.id },
            create: { userId: ancestor.id, balanceAvailable: payout },
            update: { balanceAvailable: { increment: payout } },
          });
          await tx.user.update({
            where: { id: ancestor.id },
            data: {
              pinSponsorPairFormed: true,
              pinSponsorHeldLeft: 0,
              pinSponsorHeldRight: 0,
            },
          });
        } else {
          // Still waiting on the other side — just bump the held counter.
          await tx.user.update({
            where: { id: ancestor.id },
            data: isLeftSide
              ? { pinSponsorHeldLeft: { increment: 1 } }
              : { pinSponsorHeldRight: { increment: 1 } },
          });
        }
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
