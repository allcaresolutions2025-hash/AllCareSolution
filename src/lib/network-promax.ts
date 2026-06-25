import { Slot } from "@prisma/client";
import { prisma } from "./db";
import { MAX_DOWNLINE_DEPTH, type DownlineNode } from "./network";

// Pro Max genealogy helpers. The Pro Max TREE GRAPH is the SEPARATE tree
// (proMaxReferrerId / proMaxSlot) — where Pro Max leaders create new Pro Max
// users. (Dashboard earnings/counts use the main-tree overlay; the graph is
// the separate structure.)

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

export async function getProMaxNetworkSnapshot(rootUserId: string, maxDepth = MAX_DOWNLINE_DEPTH) {
  const nodes = await getProMaxDownline(rootUserId, maxDepth);
  return { nodes, totalMembers: nodes.length };
}

// Count the NEW users created in the separate Pro Max tree (proMaxReferrerId)
// that descend from Pro Max roots sitting under a user's LEFT vs RIGHT direct
// child (main tree). Lets an upline like Priya see her "Pro Max grandchildren"
// per child, with each child's own Pro Max left/right legs — even though those
// new users have no main-tree position.
//
// leftSubtreeIds / rightSubtreeIds = the main-tree subtree of the LEFT / RIGHT
// direct child (each including the child itself).
export async function getProMaxNewUsersUnderChildren(
  leftSubtreeIds: Set<string>,
  rightSubtreeIds: Set<string>,
): Promise<{ leftL: number; leftR: number; rightL: number; rightR: number }> {
  const [roots, edges] = await Promise.all([
    prisma.user.findMany({
      where: { isProMax: true, proMaxReferrerId: null },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: { proMaxReferrerId: { not: null } },
      select: { id: true, proMaxReferrerId: true, proMaxSlot: true },
    }),
  ]);

  // Build the Pro Max tree: parent -> children (with side).
  const childrenMap = new Map<string, { id: string; slot: Slot | null }[]>();
  for (const e of edges) {
    if (!e.proMaxReferrerId) continue;
    const arr = childrenMap.get(e.proMaxReferrerId) ?? [];
    arr.push({ id: e.id, slot: e.proMaxSlot });
    childrenMap.set(e.proMaxReferrerId, arr);
  }

  const subtreeSize = (id: string): number => {
    let total = 0;
    const stack = [id];
    while (stack.length) {
      const x = stack.pop()!;
      for (const c of childrenMap.get(x) ?? []) {
        total += 1;
        stack.push(c.id);
      }
    }
    return total;
  };

  // For a Pro Max root, total new users on its LEFT vs RIGHT Pro Max leg.
  const legCounts = (rootId: string): { l: number; r: number } => {
    let l = 0;
    let r = 0;
    for (const c of childrenMap.get(rootId) ?? []) {
      const size = 1 + subtreeSize(c.id);
      if (c.slot === "RIGHT") r += size;
      else l += size; // LEFT or unslotted falls to left
    }
    return { l, r };
  };

  let leftL = 0;
  let leftR = 0;
  let rightL = 0;
  let rightR = 0;
  for (const root of roots) {
    const inLeft = leftSubtreeIds.has(root.id);
    const inRight = rightSubtreeIds.has(root.id);
    if (!inLeft && !inRight) continue;
    const { l, r } = legCounts(root.id);
    if (inLeft) {
      leftL += l;
      leftR += r;
    } else {
      rightL += l;
      rightR += r;
    }
  }

  return { leftL, leftR, rightL, rightR };
}
