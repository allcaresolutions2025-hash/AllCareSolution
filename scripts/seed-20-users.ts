// Wipe all non-admin users and seed a 20-person fully-populated binary tree.
// Points accrue naturally via awardUplinePoints — the same engine the live
// signup flow uses — so each user ends with a realistic balance.
//
// Tree layout (1-indexed):
//   1 (Priya, ROOT)
//   ├─ 2  Rahul   L                        ├─ 3  Anjali  R
//   │  ├─ 4  Vikram L                       │  ├─ 6  Arjun  L
//   │  │  ├─ 8  Rohan  L                    │  │  ├─ 12 Manish L
//   │  │  │  ├─ 16 Sahil  L                 │  │  └─ 13 Pooja  R
//   │  │  │  └─ 17 Yash   R                 │  └─ 7  Kavya  R
//   │  │  └─ 9  Aditya R                    │     ├─ 14 Riya   L
//   │  │     ├─ 18 Nikhil L                 │     └─ 15 Karan  R
//   │  │     └─ 19 Tara   R
//   │  └─ 5  Neha   R
//   │     ├─ 10 Sneha  L
//   │     │  └─ 20 Megha  L
//   │     └─ 11 Aryan  R
//
// Run:  npm run db:seed-20

import { PrismaClient, Slot, Gender } from "@prisma/client";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { awardUplinePoints } from "../src/lib/points";
import { PAISE_PER_POINT } from "../src/lib/money";

const prisma = new PrismaClient();
const digits = customAlphabet("0123456789", 8);
const genCode = () => "AM" + digits();

const TOTAL = 20;

// PARENT[i-1] = 1-indexed parent of user i, or null for root.
const PARENT: (number | null)[] = [
  null, // 1
  1, 1,         // 2 (L of 1), 3 (R of 1)
  2, 2, 3, 3,   // 4, 5, 6, 7
  4, 4, 5, 5, 6, 6, 7, 7, // 8..15
  8, 8, 9, 9, 10,         // 16..20
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
  { name: "Priya Sharma",   gender: "FEMALE", pan: "PRYAS1234A", bankAccountName: "Priya Sharma",   bankAccountNumber: "501234567811", bankIfsc: "HDFC0001234", bankName: "HDFC Bank",                 nominee: "Aarav Sharma",   address: "12 Brigade Road, Bengaluru, Karnataka 560001",  mobile: "9000000001" },
  { name: "Rahul Patel",    gender: "MALE",   pan: "RAHUP5678B", bankAccountName: "Rahul Patel",    bankAccountNumber: "300456789012", bankIfsc: "SBIN0005678", bankName: "State Bank of India",        nominee: "Riya Patel",     address: "21 SG Highway, Ahmedabad, Gujarat 380015",       mobile: "9000000002" },
  { name: "Anjali Verma",   gender: "FEMALE", pan: "ANJAV9012C", bankAccountName: "Anjali Verma",   bankAccountNumber: "812334567890", bankIfsc: "ICIC0003456", bankName: "ICICI Bank",                 nominee: "Karan Verma",    address: "8 Park Street, Kolkata, West Bengal 700016",     mobile: "9000000003" },
  { name: "Vikram Singh",   gender: "MALE",   pan: "VIKMS3456D", bankAccountName: "Vikram Singh",   bankAccountNumber: "401223456789", bankIfsc: "PUNB0002345", bankName: "Punjab National Bank",       nominee: "Geeta Singh",    address: "5 MG Road, Jaipur, Rajasthan 302001",            mobile: "9000000004" },
  { name: "Neha Gupta",     gender: "FEMALE", pan: "NEHAG7890E", bankAccountName: "Neha Gupta",     bankAccountNumber: "700123987654", bankIfsc: "BARB0005678", bankName: "Bank of Baroda",             nominee: "Mohit Gupta",    address: "Sector 18, Noida, Uttar Pradesh 201301",         mobile: "9000000005" },
  { name: "Arjun Reddy",    gender: "MALE",   pan: "ARJUR2345F", bankAccountName: "Arjun Reddy",    bankAccountNumber: "601198765012", bankIfsc: "ANDB0001122", bankName: "Andhra Bank",                nominee: "Lakshmi Reddy",  address: "Jubilee Hills, Hyderabad, Telangana 500033",     mobile: "9000000006" },
  { name: "Kavya Iyer",     gender: "FEMALE", pan: "KAVYI6789G", bankAccountName: "Kavya Iyer",     bankAccountNumber: "990012345678", bankIfsc: "CNRB0003344", bankName: "Canara Bank",                nominee: "Suresh Iyer",    address: "T Nagar, Chennai, Tamil Nadu 600017",            mobile: "9000000007" },
  { name: "Rohan Khanna",   gender: "MALE",   pan: "ROHAN0123H", bankAccountName: "Rohan Khanna",   bankAccountNumber: "112233445566", bankIfsc: "HDFC0007788", bankName: "HDFC Bank",                 nominee: "Meera Khanna",   address: "Connaught Place, New Delhi, Delhi 110001",       mobile: "9000000008" },
  { name: "Sneha Joshi",    gender: "FEMALE", pan: "SNHJO4567J", bankAccountName: "Sneha Joshi",    bankAccountNumber: "910087654321", bankIfsc: "UTIB0008899", bankName: "Axis Bank",                 nominee: "Aditya Joshi",   address: "FC Road, Pune, Maharashtra 411005",              mobile: "9000000009" },
  { name: "Karan Malhotra", gender: "MALE",   pan: "KARMA8901K", bankAccountName: "Karan Malhotra", bankAccountNumber: "616098765432", bankIfsc: "KKBK0009900", bankName: "Kotak Mahindra Bank",       nominee: "Pooja Malhotra", address: "GK-1, New Delhi, Delhi 110048",                  mobile: "9000000010" },
  { name: "Aryan Mehta",    gender: "MALE",   pan: "ARYAM1122L", bankAccountName: "Aryan Mehta",    bankAccountNumber: "412385012347", bankIfsc: "YESB0001100", bankName: "Yes Bank",                  nominee: "Pinky Mehta",    address: "Bandra West, Mumbai, Maharashtra 400050",        mobile: "9000000011" },
  { name: "Manish Das",     gender: "MALE",   pan: "MANID3344M", bankAccountName: "Manish Das",     bankAccountNumber: "521098345120", bankIfsc: "INDB0002255", bankName: "IndusInd Bank",             nominee: "Sushma Das",     address: "Salt Lake, Kolkata, West Bengal 700064",         mobile: "9000000012" },
  { name: "Pooja Nair",     gender: "FEMALE", pan: "POOJN5566N", bankAccountName: "Pooja Nair",     bankAccountNumber: "303456120987", bankIfsc: "FDRL0001255", bankName: "Federal Bank",              nominee: "Ajay Nair",      address: "Kochi, Kerala 682001",                            mobile: "9000000013" },
  { name: "Riya Banerjee",  gender: "FEMALE", pan: "RIYAB7788P", bankAccountName: "Riya Banerjee",  bankAccountNumber: "601230789456", bankIfsc: "SBIN0003355", bankName: "State Bank of India",       nominee: "Shubhra Banerjee", address: "Ballygunge, Kolkata, West Bengal 700019",       mobile: "9000000014" },
  { name: "Karan Bhatt",    gender: "MALE",   pan: "KARBH9900Q", bankAccountName: "Karan Bhatt",    bankAccountNumber: "707812345090", bankIfsc: "BARB0009933", bankName: "Bank of Baroda",            nominee: "Veena Bhatt",    address: "Vasai West, Mumbai, Maharashtra 401202",         mobile: "9000000015" },
  { name: "Sahil Kapoor",   gender: "MALE",   pan: "SAHIK2233R", bankAccountName: "Sahil Kapoor",   bankAccountNumber: "503467890123", bankIfsc: "HDFC0004411", bankName: "HDFC Bank",                 nominee: "Anita Kapoor",   address: "Greater Kailash, New Delhi, Delhi 110048",       mobile: "9000000016" },
  { name: "Yash Agarwal",   gender: "MALE",   pan: "YASHA4455S", bankAccountName: "Yash Agarwal",   bankAccountNumber: "212309876541", bankIfsc: "ICIC0005522", bankName: "ICICI Bank",                nominee: "Sunita Agarwal", address: "Hazratganj, Lucknow, Uttar Pradesh 226001",      mobile: "9000000017" },
  { name: "Nikhil Rao",     gender: "MALE",   pan: "NIKHR6677T", bankAccountName: "Nikhil Rao",     bankAccountNumber: "888812345067", bankIfsc: "CNRB0006677", bankName: "Canara Bank",                nominee: "Lalita Rao",     address: "Indiranagar, Bengaluru, Karnataka 560038",       mobile: "9000000018" },
  { name: "Tara Pillai",    gender: "FEMALE", pan: "TARAP8899U", bankAccountName: "Tara Pillai",    bankAccountNumber: "405678123490", bankIfsc: "SBIN0007788", bankName: "State Bank of India",       nominee: "Rohit Pillai",   address: "Marine Drive, Mumbai, Maharashtra 400020",       mobile: "9000000019" },
  { name: "Megha Saxena",   gender: "FEMALE", pan: "MEGHS0011V", bankAccountName: "Megha Saxena",   bankAccountNumber: "133445567789", bankIfsc: "UTIB0008844", bankName: "Axis Bank",                 nominee: "Vinay Saxena",   address: "Civil Lines, Allahabad, Uttar Pradesh 211001",   mobile: "9000000020" },
];

async function wipeNonAdmins() {
  const nonAdmins = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: { id: true },
  });
  const ids = nonAdmins.map((u) => u.id);
  if (ids.length === 0) return 0;

  // Clear FKs that DON'T cascade. (Loan / LoanInstallment / DailyPayout /
  // KycDetail / Wallet / Address all cascade on delete.)
  await prisma.commission.deleteMany({ where: { OR: [{ beneficiaryId: { in: ids } }, { order: { userId: { in: ids } } }] } });
  await prisma.payoutRequest.deleteMany({ where: { userId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: ids } } } });
  await prisma.order.deleteMany({ where: { userId: { in: ids } } });
  await prisma.pin.deleteMany({ where: { OR: [{ ownerId: { in: ids } }, { usedForUserId: { in: ids } }] } });
  await prisma.pinRequest.deleteMany({ where: { userId: { in: ids } } });
  await prisma.cartItem.deleteMany({ where: { userId: { in: ids } } });

  const deleted = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  return deleted.count;
}

async function main() {
  console.log("🧹 Wiping all non-admin users…");
  const wiped = await wipeNonAdmins();
  console.log(`   Removed ${wiped} user(s).`);

  // Reset the daily-payout cron checkpoint so the next "Simulate midnight"
  // works against a clean slate.
  await prisma.setting.deleteMany({ where: { key: "points_decay_last_run_ist_date" } });

  console.log(`\n🌳 Seeding ${TOTAL} fully-populated binary-tree dummies…`);

  // Determine L/R slot per child (1st direct = L, 2nd = R).
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
      `✓ ${String(i).padStart(2)}  ${profile.name.padEnd(18)} ${profile.gender.padEnd(6)} ${(slot ?? "ROOT").padEnd(5)} → ${pts} pts  ${user.referralCode}`,
    );
  }

  console.log("\nFinal wallets (post-engine, all uplines credited):");
  let grandTotal = 0;
  for (let i = 1; i <= TOTAL; i++) {
    const id = idByIndex.get(i);
    if (!id) continue;
    const wallet = await prisma.wallet.findUnique({ where: { userId: id } });
    const pts = (wallet?.balanceAvailable ?? 0) / PAISE_PER_POINT;
    grandTotal += pts;
    console.log(`   ${String(i).padStart(2)}  ${PROFILES[i - 1].name.padEnd(18)} → ${String(pts).padStart(5)} pts`);
  }
  console.log(`\n   Total points across all 20 users: ${grandTotal} pts`);

  console.log("\nDone. Login with any dummyN@example.com / password: Dummy@2026 (N = 1..20).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
