// Franchise system.
//
// A franchise leader is an ordinary member the admin has promoted (User.isFranchise).
// Every member is "owned" by the NEAREST franchise leader above them in the
// referral chain — so if a franchise leader sits under another franchise leader,
// the closer one handles their people. A member with no franchise ancestor is
// owned by nobody and their requests go straight to the admin, exactly as they
// did before franchises existed.
//
// Ownership drives two queues:
//   • Loan requests      — leader vets, then the admin approves/disburses.
//   • Welcome Kit claims — leader approves AND delivers; the admin is notified.
// Everything else (other reward levels, pins, payouts) is untouched by this.

import type { Prisma } from "@prisma/client";
import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { prisma } from "./db";

type FranchiseAuthOk = { ok: true; session: Session; leaderId: string };
type FranchiseAuthFail = { ok: false; response: NextResponse };

/**
 * Guard for the franchise portal API. The isFranchise flag is read from the DB
 * (not the JWT) so a revoked franchise loses access immediately rather than at
 * their next sign-in.
 */
export async function requireFranchise(): Promise<FranchiseAuthOk | FranchiseAuthFail> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }) };
  }
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isFranchise: true },
  });
  if (!me?.isFranchise) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session, leaderId: session.user.id };
}

// A member may ask to become a franchise while their team is still under this
// size. Above it they are expected to already be an established leader and are
// promoted by the admin directly instead.
export const FRANCHISE_REQUEST_MAX_TEAM = 100;

export function canRequestFranchise(u: {
  isFranchise: boolean;
  leftLegCount: number;
  rightLegCount: number;
}): boolean {
  if (u.isFranchise) return false;
  return u.leftLegCount + u.rightLegCount < FRANCHISE_REQUEST_MAX_TEAM;
}

/**
 * Walk up the referral chain from `userId` and return the id of the nearest
 * ancestor with isFranchise = true, or null if there is none. The member
 * themselves is skipped — a franchise leader's own requests go to the admin,
 * not to themselves (unless a franchise sits above them).
 */
export async function getFranchiseLeaderId(userId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE chain AS (
      SELECT u.id, u."referrerId", u."isFranchise", 0 AS depth
      FROM "User" u WHERE u.id = ${userId}
      UNION ALL
      SELECT p.id, p."referrerId", p."isFranchise", c.depth + 1
      FROM "User" p
      JOIN chain c ON c."referrerId" = p.id
      WHERE c.depth < 100
    )
    SELECT id FROM chain
    WHERE "isFranchise" = true AND depth > 0
    ORDER BY depth ASC
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

/**
 * The ids of every member owned by franchise leader `leaderId` — their whole
 * downline, minus anyone who sits under a NESTED franchise leader (those belong
 * to that closer leader). The nested leader themselves is still included, since
 * their own requests route up to this leader.
 */
export async function getFranchiseMemberIds(leaderId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE team AS (
      SELECT u.id, u."isFranchise", 1 AS depth
      FROM "User" u WHERE u."referrerId" = ${leaderId}
      UNION ALL
      SELECT c.id, c."isFranchise", t.depth + 1
      FROM "User" c
      JOIN team t ON c."referrerId" = t.id
      -- stop descending past a nested franchise: their subtree is theirs to run
      WHERE t."isFranchise" = false AND t.depth < 100
    )
    SELECT id FROM team
  `;
  return rows.map((r) => r.id);
}

/** Franchise-owned members with the profile fields the portal tables need. */
export async function getFranchiseMembers(leaderId: string) {
  const ids = await getFranchiseMemberIds(leaderId);
  if (ids.length === 0) return [];
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsappNumber: true,
      referralCode: true,
      isActive: true,
      isFranchise: true,
      leftLegCount: true,
      rightLegCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Resolve the franchise routing for a new request by `userId`. Returns the
 * fields to spread onto a Loan or RewardClaim at creation time.
 */
export async function franchiseRoutingFor(
  userId: string,
): Promise<{ franchiseId: string | null; franchiseStatus: "NONE" | "PENDING" }> {
  const leaderId = await getFranchiseLeaderId(userId);
  return leaderId
    ? { franchiseId: leaderId, franchiseStatus: "PENDING" }
    : { franchiseId: null, franchiseStatus: "NONE" };
}

/**
 * Prisma filter for rows the ADMIN should act on: anything not waiting on (or
 * turned down by) a franchise leader. Franchise-PENDING rows are the leader's
 * to handle first; REJECTED ones never reach the admin at all.
 */
export const adminVisibleFranchiseFilter = {
  franchiseStatus: { in: ["NONE", "APPROVED"] as const },
};

/** Notify every admin account — used when a franchise acts on something. */
export async function notifyAdmins(
  tx: Prisma.TransactionClient,
  title: string,
  body: string,
): Promise<void> {
  const admins = await tx.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await tx.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, title, body })),
  });
}

/** Digits-only phone for a wa.me link, defaulting to the Indian country code. */
export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCc = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCc}?text=${encodeURIComponent(message)}`;
}
