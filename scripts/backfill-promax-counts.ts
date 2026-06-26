/**
 * One-time backfill: recompute every user's Pro Max leg counts
 * (proMaxLeftLegCount / proMaxRightLegCount) for the SEPARATE Pro Max tree
 * (proMaxReferrerId / proMaxSlot).
 *
 * For every member placed in the Pro Max tree (proMaxReferrerId set), we walk
 * UP the Pro Max tree and increment each ancestor's left/right count on the side
 * the member sits. Matches src/lib/points-promax.ts (awardProMaxUplinePoints).
 *
 * It does NOT touch wallet balances — only the cached counts.
 *
 * Run:  npx tsx scripts/backfill-promax-counts.ts
 */
import { PrismaClient, Slot } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, proMaxReferrerId: true, proMaxSlot: true },
  });

  const byId = new Map(users.map((u) => [u.id, u]));
  const counts = new Map<string, { l: number; r: number }>();
  const bump = (id: string, side: Slot) => {
    const c = counts.get(id) ?? { l: 0, r: 0 };
    if (side === "LEFT") c.l += 1;
    else c.r += 1;
    counts.set(id, c);
  };

  const proMaxMembers = users.filter((u) => u.proMaxReferrerId);
  for (const m of proMaxMembers) {
    let cur = m.proMaxReferrerId ? byId.get(m.proMaxReferrerId) : undefined;
    let slotFromBelow = m.proMaxSlot;
    let safety = 0;
    while (cur && slotFromBelow && safety++ < 1000) {
      bump(cur.id, slotFromBelow);
      slotFromBelow = cur.proMaxSlot;
      cur = cur.proMaxReferrerId ? byId.get(cur.proMaxReferrerId) : undefined;
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
