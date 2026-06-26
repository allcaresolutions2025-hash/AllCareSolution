// PIN PRO MAX points engine — OVERLAY on the existing 1000-pt binary tree.
//
// Pro Max is NOT a separate tree. A member "becomes Pro Max" (an upgrade flag,
// User.isProMax) while keeping their existing position in the main tree
// (referrerId / slot). When that happens, Pro Max value cascades UP the main
// tree to their uplines — exactly like the 1000-pt engine, but it fires on the
// upgrade event rather than on a new join, credits the Pro Max wallet
// (Wallet.proMaxBalanceAvailable), and counts Pro Max members per leg
// (User.proMaxLeftLegCount / proMaxRightLegCount).
//
// Rules (applied when member M flips to Pro Max):
//
//   RULE 1 — Direct referral bonus (+2,000)
//     M's direct upline (M.referrerId) earns +2,000 for a direct downline
//     going Pro Max. So a parent whose LEFT and RIGHT direct children both go
//     Pro Max earns 2,000 + 2,000 = 4,000.
//
//   RULE 2 — Pair-match cascade (+2,000 / +1,000)
//     For every ancestor ABOVE the direct parent (depth ≥ 2), M adds 1 to that
//     ancestor's proMaxLeftLegCount / proMaxRightLegCount (whichever side M sits
//     on). If this grows the ancestor's min(L, R), the ancestor earns a pair
//     match:
//        - +2,000 within 15 levels of M (depth ≤ 15)
//        - +1,000 at 16+ levels
//     The DIRECT parent is NOT paid a pair match (they already got the direct
//     referral); pairing pays the uplines above as both sides fill — e.g. Priya
//     earns a pair match when grandchildren fill her left AND right.
//     Ancestors earn regardless of whether they are Pro Max themselves — but a
//     non-Pro-Max upline's Pro Max points are held until they go Pro Max (see
//     the payout gate in daily-payout.ts).
//
// All points are stored as paise in Wallet.proMaxBalanceAvailable.

import { Prisma, PrismaClient, Slot } from "@prisma/client";
import { PAISE_PER_POINT } from "./money";

export const PROMAX_POINTS_PER_DIRECT_REFERRAL = 2000;
export const PROMAX_PAIR_MATCH_POINTS_NEAR = 2000; // ancestors ≤15 levels above
export const PROMAX_PAIR_MATCH_POINTS_FAR = 1000;  // ancestors 16+ levels above
export const PROMAX_PAIR_MATCH_DEPTH_THRESHOLD = 15;

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Award Pro Max points when member `memberId` becomes Pro Max. Walks the MAIN
 * binary tree (referrerId / slot). Caller opens the transaction and is
 * responsible for only calling this once per member (on the flip to Pro Max).
 */
export async function awardProMaxOnUpgrade(tx: Tx, memberId: string): Promise<void> {
  const member = await tx.user.findUnique({
    where: { id: memberId },
    select: { referrerId: true, slot: true },
  });
  // Root / unplaced members have no upline to credit.
  if (!member?.referrerId || !member.slot) return;

  const directPaise = PROMAX_POINTS_PER_DIRECT_REFERRAL * PAISE_PER_POINT;
  const nearPaise = PROMAX_PAIR_MATCH_POINTS_NEAR * PAISE_PER_POINT;
  const farPaise = PROMAX_PAIR_MATCH_POINTS_FAR * PAISE_PER_POINT;

  // RULE 1 — direct upline gets +2,000 for this direct Pro Max conversion.
  await tx.wallet.upsert({
    where: { userId: member.referrerId },
    create: { userId: member.referrerId, proMaxBalanceAvailable: directPaise },
    update: { proMaxBalanceAvailable: { increment: directPaise } },
  });

  // Walk up the main tree. For each ancestor: bump the Pro Max leg count on the
  // side M sits, then award a pair match when min(L, R) grows.
  let ancestorId: string | null = member.referrerId;
  let slotFromBelow: Slot = member.slot;
  let depth = 1;
  let safety = 0;

  while (ancestorId && safety++ < 1000) {
    const ancestor: {
      id: string;
      referrerId: string | null;
      slot: Slot | null;
      proMaxLeftLegCount: number;
      proMaxRightLegCount: number;
    } | null = await tx.user.findUnique({
      where: { id: ancestorId },
      select: {
        id: true,
        referrerId: true,
        slot: true,
        proMaxLeftLegCount: true,
        proMaxRightLegCount: true,
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

    await tx.user.update({
      where: { id: ancestor.id },
      data: isLeftSide
        ? { proMaxLeftLegCount: { increment: 1 } }
        : { proMaxRightLegCount: { increment: 1 } },
    });

    // RULE 2 — pair match when the SHORTER leg grew, for ancestors ABOVE the
    // direct parent only (depth ≥ 2). The direct parent (depth 1) is paid via
    // the direct-referral bonus instead.
    if (depth >= 2 && newMin > oldMin) {
      const matchPaise = depth <= PROMAX_PAIR_MATCH_DEPTH_THRESHOLD ? nearPaise : farPaise;
      await tx.wallet.upsert({
        where: { userId: ancestor.id },
        create: { userId: ancestor.id, proMaxBalanceAvailable: matchPaise },
        update: { proMaxBalanceAvailable: { increment: matchPaise } },
      });
    }

    if (!ancestor.referrerId || !ancestor.slot) break;
    slotFromBelow = ancestor.slot;
    ancestorId = ancestor.referrerId;
    depth++;
  }
}
