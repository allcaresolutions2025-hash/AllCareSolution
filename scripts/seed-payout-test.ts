// Demo scenario for the daily-payout system.
//
// What it does:
//   1. Picks 3 existing users (Priya, Anjali, Karan from the binary seed —
//      falls back to the first 3 non-admin users if those names aren't there).
//   2. Wipes their balanceAvailable and gives them known starting points:
//        Priya  -> 1,500 pts
//        Anjali ->   800 pts
//        Karan  -> 2,200 pts
//   3. Prints a "before" snapshot.
//
// Then go to /admin/daily-payouts and click "Simulate now". Expected:
//   Priya  -> paid 1,350 / forfeit 150 / new balance 0
//   Anjali -> paid 720   / forfeit 80  / new balance 0
//   Karan  -> paid 1,980 / forfeit 220 / new balance 0
//   Total  -> 3 payouts, 3 wallets reset, paid 4,050, forfeit 450
//
// Run:  npx tsx scripts/seed-payout-test.ts

import { PrismaClient } from "@prisma/client";
import { PAISE_PER_POINT } from "../src/lib/money";

const prisma = new PrismaClient();

// Display points -> paise. With PAISE_PER_POINT=1, 1500 pts is stored as 1500.
const pts = (n: number) => n * PAISE_PER_POINT;

const PRESET: Array<{ namePart: string; points: number }> = [
  { namePart: "Priya",  points: 1500 },
  { namePart: "Anjali", points:  800 },
  { namePart: "Karan",  points: 2200 },
];

async function main() {
  // Try to resolve target users by name first.
  const targets: { id: string; name: string; points: number }[] = [];
  for (const p of PRESET) {
    const u = await prisma.user.findFirst({
      where: { name: { contains: p.namePart, mode: "insensitive" }, role: "CUSTOMER" },
      select: { id: true, name: true },
    });
    if (u) targets.push({ id: u.id, name: u.name, points: p.points });
  }

  // Fallback: if we didn't find any of the named users, pick the first 3 non-admin
  // accounts so the demo still works against an unseeded DB.
  if (targets.length === 0) {
    const fallback = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      take: 3,
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
    fallback.forEach((u, i) => {
      targets.push({ id: u.id, name: u.name, points: PRESET[i]?.points ?? 1000 });
    });
  }

  if (targets.length === 0) {
    console.error("No customer users in the database. Run `npm run db:seed-binary` first.");
    process.exit(1);
  }

  console.log("\n== Seeding demo balances ==");
  for (const t of targets) {
    await prisma.wallet.upsert({
      where: { userId: t.id },
      create: { userId: t.id, balanceAvailable: pts(t.points) },
      update: { balanceAvailable: pts(t.points) },
    });
    console.log(`  ${t.name.padEnd(24)} -> ${t.points.toString().padStart(6)} pts`);
  }

  // Show the "before" snapshot.
  const totalBefore = targets.reduce((acc, t) => acc + t.points, 0);
  console.log(`\n== BEFORE simulate-midnight ==`);
  console.log(`  Users with balance: ${targets.length}`);
  console.log(`  Total points       : ${totalBefore} pts`);
  console.log(`\n== EXPECTED after simulate-midnight ==`);
  console.log(`  Each user's balanceAvailable -> 0`);
  console.log(`  Total paid (90%)             : ${Math.floor(totalBefore * 0.9)} pts`);
  console.log(`  Total forfeit (10%)          : ${totalBefore - Math.floor(totalBefore * 0.9)} pts`);
  for (const t of targets) {
    const paid = Math.floor(t.points * 0.9);
    console.log(`    ${t.name.padEnd(24)} paid ${paid.toString().padStart(6)} / forfeit ${(t.points - paid).toString().padStart(4)}`);
  }
  console.log(`\nNow open /admin/daily-payouts and click "Simulate now".`);
  console.log(`Re-run this script any time to reset the demo balances.\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
