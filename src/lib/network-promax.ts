import { getDownline, MAX_DOWNLINE_DEPTH, type DownlineNode } from "./network";

// Pro Max genealogy helpers. Pro Max now OVERLAYS the main binary tree (members
// upgrade in place), so the Pro Max tree IS the main tree — these simply
// delegate to the main-tree traversal. The Pro Max pages render per-node Pro
// Max points/leg counts on top of this structure.

export async function getProMaxDownline(
  rootUserId: string,
  maxDepth = MAX_DOWNLINE_DEPTH,
): Promise<DownlineNode[]> {
  return getDownline(rootUserId, maxDepth);
}

export async function getProMaxNetworkSnapshot(rootUserId: string, maxDepth = MAX_DOWNLINE_DEPTH) {
  const nodes = await getProMaxDownline(rootUserId, maxDepth);
  return { nodes, totalMembers: nodes.length };
}
