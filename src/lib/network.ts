import { prisma } from "./db";

export const MAX_DOWNLINE_DEPTH = 50;

export type DownlineNode = {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  referrerId: string | null;
  slot: "LEFT" | "RIGHT" | null;
  createdAt: Date;
  isActive: boolean;
  depth: number;
  gender: "MALE" | "FEMALE" | null;
  // populated by enrichDownlineWithSales:
  salesPaise: number;
  orderCount: number;
  commissionToRootPaise: number;
};

type RawRow = {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  referrerId: string | null;
  slot: "LEFT" | "RIGHT" | null;
  createdAt: Date;
  isActive: boolean;
  depth: number;
  gender: "MALE" | "FEMALE" | null;
};

/**
 * Fetch the full downline tree under `rootUserId`, capped at MAX_DOWNLINE_DEPTH.
 * Uses a recursive CTE — one round-trip regardless of tree size.
 */
export async function getDownline(rootUserId: string, maxDepth = MAX_DOWNLINE_DEPTH): Promise<DownlineNode[]> {
  const rows = await prisma.$queryRaw<RawRow[]>`
    WITH RECURSIVE downline AS (
      SELECT id, name, email, "referralCode", "referrerId", slot, "createdAt", "isActive", gender, 1 AS depth
      FROM "User"
      WHERE "referrerId" = ${rootUserId}
      UNION ALL
      SELECT u.id, u.name, u.email, u."referralCode", u."referrerId", u.slot, u."createdAt", u."isActive", u.gender, d.depth + 1
      FROM "User" u
      JOIN downline d ON u."referrerId" = d.id
      WHERE d.depth < ${maxDepth}
    )
    SELECT * FROM downline ORDER BY depth ASC, "createdAt" ASC
  `;
  return rows.map((r) => ({
    ...r,
    slot: (r.slot as "LEFT" | "RIGHT" | null) ?? null,
    salesPaise: 0,
    orderCount: 0,
    commissionToRootPaise: 0,
  }));
}

/**
 * Enrich downline rows with each member's paid-order sales total and the
 * commission earned BY `rootUserId` from each downline member's orders.
 */
export async function enrichDownlineWithSales(
  rootUserId: string,
  nodes: DownlineNode[],
): Promise<DownlineNode[]> {
  if (nodes.length === 0) return nodes;
  const ids = nodes.map((n) => n.id);

  const [sales, commissions] = await Promise.all([
    prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.commission.findMany({
      where: {
        beneficiaryId: rootUserId,
        status: { in: ["PENDING", "AVAILABLE", "REQUESTED", "PAID"] },
        order: { userId: { in: ids } },
      },
      select: { commissionAmount: true, order: { select: { userId: true } } },
    }),
  ]);

  const salesByUser = new Map(sales.map((s) => [s.userId, { sum: s._sum.totalAmount ?? 0, count: s._count._all }]));
  const commByUser = new Map<string, number>();
  for (const c of commissions) {
    commByUser.set(c.order.userId, (commByUser.get(c.order.userId) ?? 0) + c.commissionAmount);
  }

  return nodes.map((n) => {
    const s = salesByUser.get(n.id);
    return {
      ...n,
      salesPaise: s?.sum ?? 0,
      orderCount: s?.count ?? 0,
      commissionToRootPaise: commByUser.get(n.id) ?? 0,
    };
  });
}

export type LevelSummary = {
  level: number;
  members: number;
  activeMembers: number;
  teamSalesPaise: number;
  commissionEarnedPaise: number;
};

export function summarizeByLevel(nodes: DownlineNode[]): LevelSummary[] {
  const map = new Map<number, LevelSummary>();
  for (const n of nodes) {
    let row = map.get(n.depth);
    if (!row) {
      row = { level: n.depth, members: 0, activeMembers: 0, teamSalesPaise: 0, commissionEarnedPaise: 0 };
      map.set(n.depth, row);
    }
    row.members += 1;
    if (n.isActive) row.activeMembers += 1;
    row.teamSalesPaise += n.salesPaise;
    row.commissionEarnedPaise += n.commissionToRootPaise;
  }
  return Array.from(map.values()).sort((a, b) => a.level - b.level);
}

/** Group nodes by depth — handy for rendering the tree level by level. */
export function groupByLevel(nodes: DownlineNode[]): Map<number, DownlineNode[]> {
  const map = new Map<number, DownlineNode[]>();
  for (const n of nodes) {
    const arr = map.get(n.depth);
    if (arr) arr.push(n);
    else map.set(n.depth, [n]);
  }
  return map;
}

/**
 * Compute each leg's *fill depth* — the deepest level to which the binary tree
 * under `rootUserId` is a perfectly filled (gap-free) binary tree on that side.
 *
 * A leg's direct slot under root is level 1. The leg is "filled to level N" only
 * when every node in levels 1..N-1 has BOTH its LEFT and RIGHT children present.
 * The classic recurrence `fill(node) = 1 + min(fill(left), fill(right))` yields
 * exactly this: a missing child contributes 0, capping the depth at the first
 * gap. An empty direct slot therefore yields fill depth 0 for that leg.
 *
 * Used for loan eligibility (see lib/loan.ts). Depth is capped at `maxDepth`
 * since no loan tier needs more than level 15, keeping the query small.
 */
export async function getLegFillDepths(
  rootUserId: string,
  maxDepth = 16,
): Promise<{ leftFillDepth: number; rightFillDepth: number }> {
  const rows = await prisma.$queryRaw<
    { id: string; referrerId: string | null; slot: "LEFT" | "RIGHT" | null }[]
  >`
    WITH RECURSIVE downline AS (
      SELECT id, "referrerId", slot, 1 AS depth
      FROM "User"
      WHERE "referrerId" = ${rootUserId}
      UNION ALL
      SELECT u.id, u."referrerId", u.slot, d.depth + 1
      FROM "User" u
      JOIN downline d ON u."referrerId" = d.id
      WHERE d.depth < ${maxDepth}
    )
    SELECT id, "referrerId", slot FROM downline
  `;

  // parentId -> { LEFT?: childId, RIGHT?: childId }
  const childByParent = new Map<string, { LEFT?: string; RIGHT?: string }>();
  let leftRoot: string | undefined;
  let rightRoot: string | undefined;
  for (const r of rows) {
    if (r.referrerId === rootUserId) {
      if (r.slot === "LEFT") leftRoot = r.id;
      else if (r.slot === "RIGHT") rightRoot = r.id;
    }
    if (r.referrerId) {
      const entry = childByParent.get(r.referrerId) ?? {};
      if (r.slot === "LEFT") entry.LEFT = r.id;
      else if (r.slot === "RIGHT") entry.RIGHT = r.id;
      childByParent.set(r.referrerId, entry);
    }
  }

  const fill = (nodeId: string | undefined): number => {
    if (!nodeId) return 0;
    const c = childByParent.get(nodeId);
    return 1 + Math.min(fill(c?.LEFT), fill(c?.RIGHT));
  };

  return { leftFillDepth: fill(leftRoot), rightFillDepth: fill(rightRoot) };
}

/** Convenience: tree + enriched stats + level summary, one call. */
export async function getNetworkSnapshot(rootUserId: string, maxDepth = MAX_DOWNLINE_DEPTH) {
  const raw = await getDownline(rootUserId, maxDepth);
  const nodes = await enrichDownlineWithSales(rootUserId, raw);
  return {
    nodes,
    byLevel: groupByLevel(nodes),
    summary: summarizeByLevel(nodes),
    totalMembers: nodes.length,
    totalTeamSalesPaise: nodes.reduce((a, n) => a + n.salesPaise, 0),
    totalCommissionPaise: nodes.reduce((a, n) => a + n.commissionToRootPaise, 0),
  };
}
