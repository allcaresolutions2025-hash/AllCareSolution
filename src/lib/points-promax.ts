// Real-time points engine for the PIN PRO MAX binary tree.
//
// This is a parallel copy of src/lib/points.ts that operates ONLY on the Pro
// Max placement fields (proMaxReferrerId / proMaxSlot / proMaxLeftLegCount /
// proMaxRightLegCount / proMaxPairBonusAwarded) and credits ONLY the Pro Max
// wallet (Wallet.proMaxBalanceAvailable). The 1000-pt engine in points.ts is
// never touched, and this engine never reads or writes the 1000-pt fields.
//
// Rules (in order applied when a new Pro Max joiner N is inserted):
//
//   RULE 1 — First-pair bonus (+5,000)
//     The placement parent gets a one-time +5,000 the moment their Pro Max
//     LEFT and RIGHT direct slots are first both filled. Tracked via
//     User.proMaxPairBonusAwarded so it pays once per user.
//
//   RULE 2 — Pair-match cascade (uplines, +2,000 / +1,000)
//     For every ancestor strictly ABOVE the placement parent, N adds 1 to that
//     ancestor's proMaxLeftLegCount or proMaxRightLegCount. If this grows the
//     ancestor's min(L, R), the ancestor earns one pair match:
//        - +2,000 when the ancestor sits within 15 levels of N (depth ≤ 15)
//        - +1,000 when the ancestor is 16+ levels above N
//
// NOTE: unlike the 1000-pt engine there is NO per-direct-referral bonus.
//
// All points are stored as paise in Wallet.proMaxBalanceAvailable.

import { Prisma, PrismaClient, Slot } from "@prisma/client";
import { PAISE_PER_POINT } from "./money";

// Pro Max award scale (10× the 1000-pt system, minus the per-referral bonus).
export const PROMAX_FIRST_PAIR_BONUS = 5000;
export const PROMAX_PAIR_MATCH_POINTS_NEAR = 2000; // ancestors ≤15 levels above
export const PROMAX_PAIR_MATCH_POINTS_FAR = 1000;  // ancestors 16+ levels above
export const PROMAX_PAIR_MATCH_DEPTH_THRESHOLD = 15;

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Award Pro Max points triggered by a newly-added Pro Max user.
 * Caller is responsible for opening the transaction.
 */
export async function awardProMaxUplinePoints(tx: Tx, newUserId: string): Promise<void> {
  const newUser = await tx.user.findUnique({
    where: { id: newUserId },
    select: { proMaxReferrerId: true, proMaxSlot: true },
  });
  if (!newUser?.proMaxReferrerId || !newUser.proMaxSlot) return;

  const firstPairPaise = PROMAX_FIRST_PAIR_BONUS * PAISE_PER_POINT;
  const nearPaise = PROMAX_PAIR_MATCH_POINTS_NEAR * PAISE_PER_POINT;
  const farPaise = PROMAX_PAIR_MATCH_POINTS_FAR * PAISE_PER_POINT;

  // Walk up the Pro Max upline chain. For each ancestor:
  //   - bump leg counts based on which side of the ancestor the joiner is on,
  //   - direct parent: check Rule 1 (first-pair bonus),
  //   - indirect ancestor: check Rule 2 (pair-match cascade).
  let ancestorId: string | null = newUser.proMaxReferrerId;
  let slotFromBelow: Slot = newUser.proMaxSlot;
  let isDirectParent = true;
  let depth = 1;
  let safety = 0;

  while (ancestorId && safety++ < 1000) {
    const ancestor: {
      id: string;
      proMaxReferrerId: string | null;
      proMaxSlot: Slot | null;
      proMaxLeftLegCount: number;
      proMaxRightLegCount: number;
      proMaxPairBonusAwarded: boolean;
    } | null = await tx.user.findUnique({
      where: { id: ancestorId },
      select: {
        id: true,
        proMaxReferrerId: true,
        proMaxSlot: true,
        proMaxLeftLegCount: true,
        proMaxRightLegCount: true,
        proMaxPairBonusAwarded: true,
      },
    });
    if (!ancestor) break;

    const oldL = ancestor.proMaxLeftLegCount;
    const oldR = ancestor.proMaxRightLegCount;
    const isLeftSide = slotFromBelow === "LEFT";
    const newL = isLeftSide ? oldL + 1 : oldL;
    const newR = isLeftSide ? oldR : oldR + 1;
    const oldMin = Math.min(oldL, oldR);
    const newMin = Math.min(newL, newR);

    // Persist the cached leg count change.
    await tx.user.update({
      where: { id: ancestor.id },
      data: isLeftSide
        ? { proMaxLeftLegCount: { increment: 1 } }
        : { proMaxRightLegCount: { increment: 1 } },
    });

    if (isDirectParent) {
      // RULE 1 — first-pair bonus. Leg counts already reflect the addition.
      if (!ancestor.proMaxPairBonusAwarded && newL > 0 && newR > 0) {
        await tx.wallet.update({
          where: { userId: ancestor.id },
          data: { proMaxBalanceAvailable: { increment: firstPairPaise } },
        });
        await tx.user.update({
          where: { id: ancestor.id },
          data: { proMaxPairBonusAwarded: true },
        });
      }
    } else {
      // RULE 2 — pair-match cascade. Only triggers when the SHORTER leg grew.
      const delta = newMin - oldMin;
      if (delta > 0) {
        const matchPaise = depth <= PROMAX_PAIR_MATCH_DEPTH_THRESHOLD ? nearPaise : farPaise;
        await tx.wallet.upsert({
          where: { userId: ancestor.id },
          create: { userId: ancestor.id, proMaxBalanceAvailable: delta * matchPaise },
          update: { proMaxBalanceAvailable: { increment: delta * matchPaise } },
        });
      }
    }

    // Move up one level.
    if (!ancestor.proMaxReferrerId || !ancestor.proMaxSlot) break;
    slotFromBelow = ancestor.proMaxSlot;
    ancestorId = ancestor.proMaxReferrerId;
    isDirectParent = false;
    depth++;
  }
}
