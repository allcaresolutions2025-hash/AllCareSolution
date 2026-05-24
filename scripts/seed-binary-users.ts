// Wipe all non-admin users and seed 10 fully-populated dummies (5 male, 5 female)
// arranged as a binary tree, with bank details / PAN / nominee / address / gender
// fields populated.
//
// Run:  npm run db:seed-binary

import { PrismaClient, Slot, Gender } from "@prisma/client";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { awardUplinePoints } from "../src/lib/points";
import { PAISE_PER_POINT } from "../src/lib/money";

const prisma = new PrismaClient();
const digits = customAlphabet("0123456789", 8);
const genCode = () => "AM" + digits();

// Tree layout: only Priya as root member.
const TOTAL = 1;
const PARENT: (number | null)[] = [
  null, // 1 — Priya (ROOT)
];

type Profile = {
  name: string;
  gender: Gender;
  pan: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  nominee: string;
  address: string;
  mobile: string;
};

const PROFILES: Profile[] = [
  {
    name: "Priya Sharma", gender: "FEMALE",
    pan: "PRYAS1234A",
    bankAccountName: "Priya Sharma", bankAccountNumber: "501234567811", bankIfsc: "HDFC0001234", bankName: "HDFC Bank",
    nominee: "Aarav Sharma", address: "12 Brigade Road, Bengaluru, Karnataka 560001", mobile: "9000000001",
  },
];

async function wipeNonAdmins() {
  const nonAdmins = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: { id: true },
  });
  const ids = nonAdmins.map((u) => u.id);
  if (ids.length === 0) return 0;

  // Clear dependents first. Foreign keys with onDelete: Cascade clean themselves
  // when the User is deleted, but Order/Commission/PayoutRequest do NOT cascade,
  // and Pin.usedForUserId is a no-cascade FK — so clear them up front.
  await prisma.commission.deleteMany({ where: { OR: [{ beneficiaryId: { in: ids } }, { order: { userId: { in: ids } } }] } });
  await prisma.payoutRequest.deleteMany({ where: { userId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: ids } } } });
  await prisma.order.deleteMany({ where: { userId: { in: ids } } });
  await prisma.pin.deleteMany({ where: { OR: [{ ownerId: { in: ids } }, { usedForUserId: { in: ids } }] } });
  await prisma.pinRequest.deleteMany({ where: { userId: { in: ids } } });
  await prisma.cartItem.deleteMany({ where: { userId: { in: ids } } });
  // KycDetail, Wallet, Address have onDelete: Cascade.

  const deleted = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  return deleted.count;
}

async function main() {
  console.log("🧹 Wiping all non-admin users…");
  const wiped = await wipeNonAdmins();
  console.log(`   Removed ${wiped} user(s).`);

  console.log("\n🌳 Seeding 10 fully-populated binary-tree dummies…");

  // L/R slot per user (1st child of parent = L, 2nd = R).
  const directsByParent = new Map<number, number[]>();
  for (let i = 1; i <= TOTAL; i++) {
    const p = PARENT[i - 1];
    if (p === null) continue;
    const list = directsByParent.get(p) ?? [];
    list.push(i);
    directsByParent.set(p, list);
  }
  const slotByIndex = new Map<number, Slot>();
  directsByParent.forEach((kids) => {
    if (kids[0]) slotByIndex.set(kids[0], "LEFT");
    if (kids[1]) slotByIndex.set(kids[1], "RIGHT");
  });

  const passwordHash = await bcrypt.hash("Dummy@2026", 12);
  const idByIndex = new Map<number, string>();

  for (let i = 1; i <= TOTAL; i++) {
    const profile = PROFILES[i - 1];
    const parentIdx = PARENT[i - 1];
    const referrerId = parentIdx ? idByIndex.get(parentIdx)! : null;
    const slot = slotByIndex.get(i) ?? null;
    const email = `dummy${i}@example.com`;

    // Create user with an empty wallet; awardUplinePoints will credit it
    // through the same engine the live signup flow uses, so points stay
    // consistent with production behavior.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          phone: profile.mobile,
          name: profile.name,
          passwordHash,
          referralCode: genCode(),
          referrerId,
          slot,
          nominee: profile.nominee,
          gender: profile.gender,
          address: profile.address,
          panNumber: profile.pan,
          bankAccountName: profile.bankAccountName,
          bankAccountNumber: profile.bankAccountNumber,
          bankIfsc: profile.bankIfsc,
          bankName: profile.bankName,
          agreedToTermsAt: new Date(),
          wallet: { create: {} },
        },
      });
      if (referrerId) await awardUplinePoints(tx, created.id);
      return created;
    });
    idByIndex.set(i, user.id);

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    const pts = (wallet?.balanceAvailable ?? 0) / PAISE_PER_POINT;
    console.log(
      `✓ ${String(i).padStart(2)}  ${profile.name.padEnd(18)} ${profile.gender.padEnd(6)} ${slot ?? "ROOT".padEnd(5)} → ${pts} pts  ${user.referralCode}`,
    );
  }

  // Print the final wallet of every seeded user (points may have been credited
  // to earlier users by later joiners, so the per-row total above is the value
  // at insertion time only — this is the final state).
  console.log("\nFinal wallets:");
  for (let i = 1; i <= TOTAL; i++) {
    const id = idByIndex.get(i);
    if (!id) continue;
    const wallet = await prisma.wallet.findUnique({ where: { userId: id } });
    const pts = (wallet?.balanceAvailable ?? 0) / PAISE_PER_POINT;
    console.log(`   ${String(i).padStart(2)}  ${PROFILES[i - 1].name.padEnd(18)} → ${pts} pts`);
  }

  console.log("\nDone. Login with any dummyN@example.com / password: Dummy@2026 (N = 1..10).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
