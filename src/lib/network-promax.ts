import { prisma } from "./db";
import { MAX_DOWNLINE_DEPTH, type DownlineNode } from "./network";

// Pro Max genealogy helpers — a parallel copy of the 1000-pt helpers in
// network.ts that traverse the SEPARATE Pro Max tree (proMaxReferrerId /
// proMaxSlot) instead of the 1000-pt placement. Sales/commission enrichment is
// intentionally omitted: the Pro Max tree is a points-only program.

type RawRow = {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  proMaxReferrerId: string | null;
  proMaxSlot: "LEFT" | "RIGHT" | null;
  createdAt: Date;
  isActive: boolean;
  gender: "MALE" | "FEMALE" | null;
  depth: number;
};

/**
 * Fetch the full Pro Max downline under `rootUserId`, capped at
 * MAX_DOWNLINE_DEPTH. One recursive CTE round-trip regardless of tree size.
 */
export async function getProMaxDownline(
  rootUserId: string,
  maxDepth = MAX_DOWNLINE_DEPTH,
): Promise<DownlineNode[]> {
  const rows = await prisma.$queryRaw<RawRow[]>`
    WITH RECURSIVE downline AS (
      SELECT id, name, email, "referralCode", "proMaxReferrerId", "proMaxSlot", "createdAt", "isActive", gender, 1 AS depth
      FROM "User"
      WHERE "proMaxReferrerId" = ${rootUserId}
      UNION ALL
      SELECT u.id, u.name, u.email, u."referralCode", u."proMaxReferrerId", u."proMaxSlot", u."createdAt", u."isActive", u.gender, d.depth + 1
      FROM "User" u
      JOIN downline d ON u."proMaxReferrerId" = d.id
      WHERE d.depth < ${maxDepth}
    )
    SELECT * FROM downline ORDER BY depth ASC, "createdAt" ASC
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    referralCode: r.referralCode,
    // Map the Pro Max placement onto the shared DownlineNode shape so the
    // existing BinaryTreeGraph + page code can consume it unchanged.
    referrerId: r.proMaxReferrerId,
    slot: (r.proMaxSlot as "LEFT" | "RIGHT" | null) ?? null,
    createdAt: r.createdAt,
    isActive: r.isActive,
    depth: r.depth,
    gender: r.gender,
    salesPaise: 0,
    orderCount: 0,
    commissionToRootPaise: 0,
  }));
}

/** Pro Max tree snapshot — nodes + total count, no sales/commission enrichment. */
export async function getProMaxNetworkSnapshot(rootUserId: string, maxDepth = MAX_DOWNLINE_DEPTH) {
  const nodes = await getProMaxDownline(rootUserId, maxDepth);
  return { nodes, totalMembers: nodes.length };
}
