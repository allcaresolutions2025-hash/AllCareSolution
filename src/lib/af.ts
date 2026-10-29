// AF Solution accounts.
//
// An AF account is a separate login (AF-prefixed ID, e.g. AF12345678) with its
// own binary tree (User.afReferrerId / afSlot). Accounts are created two ways:
//  - a main member raises an AfIdRequest from their dashboard, the admin picks
//    the placement and creates the account;
//  - a signed-in AF account adds one directly into an open slot in its own AF
//    downline (/af/dashboard/add-member).
// Either way the first password is the mobile number. Inside the AF portal
// (/af/dashboard) the account requests packages — see package-plan.ts.

import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma, Slot } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "./auth";
import { prisma } from "./db";
import { MAX_DOWNLINE_DEPTH, type DownlineNode } from "./network";

const digits = customAlphabet("0123456789", 8);

export const AF_ID_PATTERN = /^AF[0-9]{8}$/;

/** Bank details collected when an AF account is created (same rules as member registration). */
export const afBankSchema = z.object({
  bankAccountName: z.string().trim().min(2, "Enter the account holder name as in the bank").max(80),
  bankAccountNumber: z.string().trim().regex(/^[0-9]{9,18}$/, "Invalid account number"),
  bankIfsc: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((s) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s), "Invalid IFSC"),
  bankName: z.string().trim().min(2, "Enter the bank name").max(80),
});
export type AfBankDetails = z.infer<typeof afBankSchema>;

export async function generateUniqueAfId(tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = "AF" + digits();
    const existing = await tx.user.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique AF ID after 20 attempts");
}

type AfAuth = { ok: true; session: Session } | { ok: false; response: NextResponse };

/** Guard for /api/af/* — only signed-in AF accounts pass. */
export async function requireAfAccount(): Promise<AfAuth> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }) };
  }
  if (!session.user.isAf) {
    return { ok: false, response: NextResponse.json({ error: "AF accounts only" }, { status: 403 }) };
  }
  return { ok: true, session };
}

export class AfPlacementError extends Error {}

/**
 * Create an AF account under `sponsorAfId` on `side` (or as a top-level
 * account when no sponsor is given). Profile details are copied from
 * `profileFromUserId`; bank details come from `bank` when given, otherwise
 * from that same user. The first password is the mobile number and must be
 * changed on first login.
 */
export async function createAfAccount(
  tx: Prisma.TransactionClient,
  input: {
    name: string;
    mobile: string;
    email: string;
    sponsorAfId: string | null;
    side: Slot | null;
    profileFromUserId: string;
    bank?: AfBankDetails;
    // When set, the sponsor must be this account or sit in its AF downline
    // (an AF account adding to its own tree).
    withinDownlineOf?: string;
  },
): Promise<{ id: string; afId: string }> {
  let afReferrerId: string | null = null;
  let afSlot: Slot | null = null;
  if (input.withinDownlineOf && !input.sponsorAfId) {
    throw new AfPlacementError("Choose the AF ID to place the new account under.");
  }
  if (input.sponsorAfId) {
    const sponsor = await tx.user.findUnique({
      where: { referralCode: input.sponsorAfId },
      select: { id: true, isAf: true },
    });
    if (!sponsor?.isAf) throw new AfPlacementError(`No AF account found with ID ${input.sponsorAfId}.`);
    if (input.withinDownlineOf && !(await isInAfDownline(tx, input.withinDownlineOf, sponsor.id))) {
      throw new AfPlacementError(`${input.sponsorAfId} is not in your AF tree.`);
    }
    if (!input.side) throw new AfPlacementError("Choose LEFT or RIGHT under the sponsor.");
    const taken = await tx.user.findFirst({
      where: { afReferrerId: sponsor.id, afSlot: input.side },
      select: { referralCode: true },
    });
    if (taken) {
      throw new AfPlacementError(
        `The ${input.side} slot under ${input.sponsorAfId} is already taken by ${taken.referralCode}.`,
      );
    }
    afReferrerId = sponsor.id;
    afSlot = input.side;
  }

  const profile = await tx.user.findUnique({
    where: { id: input.profileFromUserId },
    select: {
      nominee: true,
      gender: true,
      address: true,
      panNumber: true,
      bankAccountName: true,
      bankAccountNumber: true,
      bankIfsc: true,
      bankName: true,
    },
  });

  const afId = await generateUniqueAfId(tx);
  const user = await tx.user.create({
    data: {
      email: input.email.toLowerCase(),
      name: input.name,
      phone: input.mobile,
      passwordHash: await bcrypt.hash(input.mobile, 12),
      mustChangePassword: true,
      referralCode: afId,
      isAf: true,
      afReferrerId,
      afSlot,
      ...profile,
      ...input.bank,
      wallet: { create: {} },
    },
    select: { id: true },
  });
  return { id: user.id, afId };
}

/** True when `userId` is `rootUserId` itself or anywhere below it in the AF tree (no depth cap). */
export async function isInAfDownline(tx: Prisma.TransactionClient, rootUserId: string, userId: string): Promise<boolean> {
  if (rootUserId === userId) return true;
  const rows = await tx.$queryRaw<{ found: boolean }[]>`
    WITH RECURSIVE upline AS (
      SELECT id, "afReferrerId" FROM "User" WHERE id = ${userId}
      UNION ALL
      SELECT u.id, u."afReferrerId"
      FROM "User" u
      JOIN upline up ON u.id = up."afReferrerId"
    )
    SELECT EXISTS (SELECT 1 FROM upline WHERE "afReferrerId" = ${rootUserId}) AS found
  `;
  return rows[0]?.found ?? false;
}

type AfDownlineRow = {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  afReferrerId: string | null;
  afSlot: Slot | null;
  createdAt: Date;
  isActive: boolean;
  gender: "MALE" | "FEMALE" | null;
  depth: number;
};

/**
 * AF downline under `rootUserId`, mapped onto the shared DownlineNode shape so
 * BinaryTreeGraph can render it. One recursive CTE round-trip.
 */
export async function getAfDownline(rootUserId: string, maxDepth = MAX_DOWNLINE_DEPTH): Promise<DownlineNode[]> {
  const rows = await prisma.$queryRaw<AfDownlineRow[]>`
    WITH RECURSIVE downline AS (
      SELECT id, name, email, "referralCode", "afReferrerId", "afSlot", "createdAt", "isActive", gender, 1 AS depth
      FROM "User"
      WHERE "afReferrerId" = ${rootUserId}
      UNION ALL
      SELECT u.id, u.name, u.email, u."referralCode", u."afReferrerId", u."afSlot", u."createdAt", u."isActive", u.gender, d.depth + 1
      FROM "User" u
      JOIN downline d ON u."afReferrerId" = d.id
      WHERE d.depth < ${maxDepth}
    )
    SELECT * FROM downline ORDER BY depth ASC, "createdAt" ASC
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    referralCode: r.referralCode,
    referrerId: r.afReferrerId,
    slot: r.afSlot,
    createdAt: r.createdAt,
    isActive: r.isActive,
    depth: Number(r.depth),
    gender: r.gender,
    salesPaise: 0,
    orderCount: 0,
    commissionToRootPaise: 0,
  }));
}
