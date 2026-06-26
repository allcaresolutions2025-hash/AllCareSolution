import { prisma } from "./db";
import { type DownlineNode } from "./network";

// Pro Max genealogy. Pro Max OVERLAYS the main binary tree (members upgrade in
// place), so there is no separate placement. The Pro Max TREE VIEW is the main
// tree COMPRESSED to only Pro Max members: each Pro Max member links to its
// nearest Pro Max ancestor (non-Pro-Max members in between are skipped), with
// the side it sits on relative to that ancestor.

type RawRow = {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  referrerId: string | null;
  slot: "LEFT" | "RIGHT" | null;
  isProMax: boolean;
  isActive: boolean;
  gender: "MALE" | "FEMALE" | null;
  createdAt: Date;
};

// Returns the Pro Max-only tree under `rootUserId`, as DownlineNode rows whose
// referrerId/slot/depth are RELATIVE to the compressed Pro Max tree (root = the
// given user). Only Pro Max members are included.
export async function getProMaxCompressedDownline(rootUserId: string): Promise<DownlineNode[]> {
  const rows = await prisma.$queryRaw<RawRow[]>`
    WITH RECURSIVE dl AS (
      SELECT id, name, email, "referralCode", "referrerId", slot, "isProMax", "isActive", gender, "createdAt"
      FROM "User" WHERE "referrerId" = ${rootUserId}
      UNION ALL
      SELECT u.id, u.name, u.email, u."referralCode", u."referrerId", u.slot, u."isProMax", u."isActive", u.gender, u."createdAt"
      FROM "User" u JOIN dl d ON u."referrerId" = d.id
    )
    SELECT * FROM dl
  `;
  const byId = new Map(rows.map((r) => [r.id, r]));

  // For each Pro Max member, find its compressed parent (nearest Pro Max
  // ancestor, else the root) and the side it sits on under that parent.
  const compressed = new Map<string, { parentId: string; slot: "LEFT" | "RIGHT" | null }>();
  for (const n of rows) {
    if (!n.isProMax) continue;
    let childOnPath = n;
    let ancestorId = n.referrerId;
    while (ancestorId && ancestorId !== rootUserId) {
      const anc = byId.get(ancestorId);
      if (!anc) break;
      if (anc.isProMax) break;
      childOnPath = anc;
      ancestorId = anc.referrerId;
    }
    const parentIsProMax = !!(ancestorId && ancestorId !== rootUserId && byId.get(ancestorId)?.isProMax);
    compressed.set(n.id, { parentId: parentIsProMax ? ancestorId! : rootUserId, slot: childOnPath.slot });
  }

  // Compressed depths via BFS from the root.
  const childrenByParent = new Map<string, string[]>();
  for (const [id, c] of compressed) {
    const arr = childrenByParent.get(c.parentId) ?? [];
    arr.push(id);
    childrenByParent.set(c.parentId, arr);
  }
  const depthById = new Map<string, number>([[rootUserId, 0]]);
  const queue = [rootUserId];
  while (queue.length) {
    const pid = queue.shift()!;
    for (const cid of childrenByParent.get(pid) ?? []) {
      depthById.set(cid, (depthById.get(pid) ?? 0) + 1);
      queue.push(cid);
    }
  }

  const out: DownlineNode[] = [];
  for (const n of rows) {
    if (!n.isProMax) continue;
    const c = compressed.get(n.id)!;
    out.push({
      id: n.id,
      name: n.name,
      email: n.email,
      referralCode: n.referralCode,
      referrerId: c.parentId,
      slot: c.slot,
      createdAt: n.createdAt,
      isActive: n.isActive,
      depth: depthById.get(n.id) ?? 1,
      gender: n.gender,
      salesPaise: 0,
      orderCount: 0,
      commissionToRootPaise: 0,
    });
  }
  out.sort((a, b) => a.depth - b.depth);
  return out;
}

export async function getProMaxNetworkSnapshot(rootUserId: string) {
  const nodes = await getProMaxCompressedDownline(rootUserId);
  return { nodes, totalMembers: nodes.length };
}
