// AF Solution accounts.
//
// An AF account is a separate login (AF-prefixed ID, e.g. AF12345678) with its
// own binary tree (User.afReferrerId / afSlot). Members never sign up for one
// themselves: a main member raises an AfIdRequest from their dashboard, the
// admin picks the placement and creates the account, and the requester gets
// the AF ID back with the mobile number as the first password. Inside the AF
// portal (/af/dashboard) the account requests packages — see package-plan.ts.

import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma, Slot } from "@prisma/client";
import { authOptions } from "./auth";
import { prisma } from "./db";
import { MAX_DOWNLINE_DEPTH, type DownlineNode } from "./network";

const digits = customAlphabet("0123456789", 8);

export const AF_ID_PATTERN = /^AF[0-9]{8}$/;

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
 * account when no sponsor is given). Profile and bank details are copied from
 * the requesting main member so payouts work without re-entry. The first
 * password is the mobile number and must be changed on first login.
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
  },
): Promise<{ id: string; afId: string }> {
  let afReferrerId: string | null = null;
  let afSlot: Slot | null = null;
  if (input.sponsorAfId) {
    const sponsor = await tx.user.findUnique({
      where: { referralCode: input.sponsorAfId },
      select: { id: true, isAf: true },
    });
    if (!sponsor?.isAf) throw new AfPlacementError(`No AF account found with ID ${input.sponsorAfId}.`);
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
      wallet: { create: {} },
    },
    select: { id: true },
  });
  return { id: user.id, afId };
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
