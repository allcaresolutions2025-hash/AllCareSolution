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

// Tree layout (1-indexed): parent[i] = index of i's parent, null for root.
// Layout (binary):
//   1 (Priya, F) ── ROOT
//   ├─ 2 (Rahul, M)   LEFT
//   │  ├─ 4 (Vikram, M)   LEFT
//   │  │  └─ 8 (Rohan, M)   LEFT
//   │  └─ 5 (Neha, F)   RIGHT
//   │     └─ 9 (Sneha, F)   LEFT
//   └─ 3 (Anjali, F)  RIGHT
//      ├─ 6 (Arjun, M)   LEFT
//      └─ 7 (Kavya, F)   RIGHT
//         └─ 10 (Karan, M)   LEFT
const TOTAL = 10;
const PARENT: (number | null)[] = [
  null, // 1
  1, 1, // 2, 3
  2, 2, 3, 3, // 4, 5, 6, 7
  4, 5, 7, // 8, 9, 10
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
  {
    name: "Rahul Patel", gender: "MALE",
    pan: "RAHUP5678B",
    bankAccountName: "Rahul Patel", bankAccountNumber: "300456789012", bankIfsc: "SBIN0005678", bankName: "State Bank of India",
    nominee: "Meera Patel", address: "45 SG Highway, Ahmedabad, Gujarat 380015", mobile: "9000000002",
  },
  {
    name: "Anjali Verma", gender: "FEMALE",
    pan: "ANJVS9012C",
    bankAccountName: "Anjali Verma", bankAccountNumber: "022501234567", bankIfsc: "ICIC0002233", bankName: "ICICI Bank",
    nominee: "Suresh Verma", address: "9/3 Hazratganj, Lucknow, Uttar Pradesh 226001", mobile: "9000000003",
  },
  {
    name: "Vikram Singh", gender: "MALE",
    pan: "VIKMS3456D",
    bankAccountName: "Vikram Singh", bankAccountNumber: "910123456789", bankIfsc: "UTIB0003344", bankName: "Axis Bank",
    nominee: "Radha Singh", address: "22 MI Road, Jaipur, Rajasthan 302001", mobile: "9000000004",
  },
  {
    name: "Neha Gupta", gender: "FEMALE",
    pan: "NEHGP7890E",
    bankAccountName: "Neha Gupta", bankAccountNumber: "615012345678", bankIfsc: "KKBK0004455", bankName: "Kotak Mahindra Bank",
    nominee: "Manish Gupta", address: "5/8 Sector 18, Noida, Uttar Pradesh 201301", mobile: "9000000005",
  },
  {
    name: "Arjun Reddy", gender: "MALE",
    pan: "ARJRR2345F",
    bankAccountName: "Arjun Reddy", bankAccountNumber: "200012345678", bankIfsc: "HDFC0005566", bankName: "HDFC Bank",
    nominee: "Sita Reddy", address: "23 Banjara Hills, Hyderabad, Telangana 500034", mobile: "9000000006",
  },
  {
    name: "Kavya Iyer", gender: "FEMALE",
    pan: "KAVII6789G",
    bankAccountName: "Kavya Iyer", bankAccountNumber: "302145678901", bankIfsc: "SBIN0006677", bankName: "State Bank of India",
    nominee: "Lakshmi Iyer", address: "Flat 4B, T Nagar, Chennai, Tamil Nadu 600017", mobile: "9000000007",
  },
  {
    name: "Rohan Mehta", gender: "MALE",
    pan: "ROHMS0123H",
    bankAccountName: "Rohan Mehta", bankAccountNumber: "061201234567", bankIfsc: "ICIC0007788", bankName: "ICICI Bank",
    nominee: "Asha Mehta", address: "104 Linking Road, Mumbai, Maharashtra 400050", mobile: "9000000008",
  },
  {
    name: "Sneha Joshi", gender: "FEMALE",
    pan: "SNHJO4567J",
    bankAccountName: "Sneha Joshi", bankAccountNumber: "910087654321", bankIfsc: "UTIB0008899", bankName: "Axis Bank",
    nominee: "Aditya Joshi", address: "FC Road, Pune, Maharashtra 411005", mobile: "9000000009",
  },
  {
    name: "Karan Malhotra", gender: "MALE",
    pan: "KARMA8901K",
    bankAccountName: "Karan Malhotra", bankAccountNumber: "616098765432", bankIfsc: "KKBK0009900", bankName: "Kotak Mahindra Bank",
    nominee: "Pooja Malhotra", address: "GK-1, New Delhi, Delhi 110048", mobile: "9000000010",
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
