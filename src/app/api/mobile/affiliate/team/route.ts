import { NextResponse } from "next/server";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";
import { getNetworkSnapshot } from "@/lib/network";

export const dynamic = "force-dynamic";

/**
 * Team tree, capped to first 3 levels for the mobile UI.
 * Pass ?root=<userId> to drill into a descendant (still bounded by depth=3 from that root).
 */
export async function GET(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const url = new URL(req.url);
    const rootId = url.searchParams.get("root") ?? auth.user.id;

    // If drilling into a non-self root, ensure it belongs to the caller's subtree.
    if (rootId !== auth.user.id) {
      const full = await getNetworkSnapshot(auth.user.id);
      if (!full.nodes.some((n) => n.id === rootId)) {
        return NextResponse.json({ error: "Not in your team" }, { status: 403 });
      }
    }

    const snap = await getNetworkSnapshot(rootId, 3);
    return NextResponse.json({
      rootId,
      nodes: snap.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        referralCode: n.referralCode,
        referrerId: n.referrerId,
        slot: n.slot,
        depth: n.depth,
        isActive: n.isActive,
        salesPaise: n.salesPaise,
        commissionToRootPaise: n.commissionToRootPaise,
      })),
      summary: snap.summary,
      totalMembers: snap.totalMembers,
    });
  } catch (e) {
    return mobileServerError("affiliate.team", e);
  }
}
