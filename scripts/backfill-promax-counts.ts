/**
 * One-time backfill: recompute every user's Pro Max leg counts
 * (proMaxLeftLegCount / proMaxRightLegCount) for the OVERLAY model, where Pro
 * Max rides the main binary tree (referrerId / slot).
 *
 * For each Pro Max member (User.isProMax = true), we walk UP the main tree and
 * increment each ancestor's left/right Pro Max count on the side the member
 * sits. This matches src/lib/points-promax.ts (awardProMaxOnUpgrade), which
 * maintains the same counts going forward.
 *
 * It does NOT touch wallet balances (already-earned Pro Max points are left
 * as-is) — it only fixes the cached counts.
 *
 * Run:  npx tsx scripts/backfill-promax-counts.ts
 */
import { PrismaClient, Slot } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, referrerId: true, slot: true, isProMax: true },
  });

  const byId = new Map(users.map((u) => [u.id, u]));
  const counts = new Map<string, { l: number; r: number }>();
  const bump = (id: string, side: Slot) => {
    const c = counts.get(id) ?? { l: 0, r: 0 };
    if (side === "LEFT") c.l += 1;
    else c.r += 1;
    counts.set(id, c);
  };

  const proMaxMembers = users.filter((u) => u.isProMax);
  for (const m of proMaxMembers) {
    let cur = m.referrerId ? byId.get(m.referrerId) : undefined;
    let slotFromBelow = m.slot;
    let safety = 0;
    while (cur && slotFromBelow && safety++ < 1000) {
      bump(cur.id, slotFromBelow);
      slotFromBelow = cur.slot;
      cur = cur.referrerId ? byId.get(cur.referrerId) : undefined;
    }
  }

  // Users that currently have non-zero counts but shouldn't anymore.
  const currentlyNonZero = await prisma.user.findMany({
    where: { OR: [{ proMaxLeftLegCount: { gt: 0 } }, { proMaxRightLegCount: { gt: 0 } }] },
    select: { id: true },
  });

  const toUpdate = new Set<string>([...counts.keys(), ...currentlyNonZero.map((u) => u.id)]);

  let updated = 0;
  for (const id of toUpdate) {
    const c = counts.get(id) ?? { l: 0, r: 0 };
    await prisma.user.update({
      where: { id },
      data: { proMaxLeftLegCount: c.l, proMaxRightLegCount: c.r },
    });
    updated += 1;
  }

  console.log(
    `Backfill complete. Pro Max members: ${proMaxMembers.length}. Users updated: ${updated}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
