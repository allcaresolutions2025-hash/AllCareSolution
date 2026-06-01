import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";
import { getNetworkSnapshot, type DownlineNode } from "@/lib/network";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const [me, snapshot] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.user.id },
        select: {
          id: true,
          name: true,
          referralCode: true,
          wallet: {
            select: { balanceAvailable: true, balancePending: true, balancePaidLifetime: true },
          },
        },
      }),
      getNetworkSnapshot(auth.user.id),
    ]);
    if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const directs = snapshot.nodes.filter((n) => n.depth === 1);
    const leftRoot: DownlineNode | undefined = directs.find((n) => n.slot === "LEFT");
    const rightRoot: DownlineNode | undefined = directs.find((n) => n.slot === "RIGHT");

    const childrenByParent = new Map<string, DownlineNode[]>();
    for (const n of snapshot.nodes) {
      if (!n.referrerId) continue;
      const arr = childrenByParent.get(n.referrerId);
      if (arr) arr.push(n);
      else childrenByParent.set(n.referrerId, [n]);
    }
    function subtreeIds(rootId: string): Set<string> {
      const out = new Set<string>([rootId]);
      const stack = [rootId];
      while (stack.length) {
        const id = stack.pop()!;
        for (const c of childrenByParent.get(id) ?? []) {
          out.add(c.id);
          stack.push(c.id);
        }
      }
      return out;
    }
    const leftIds = leftRoot ? subtreeIds(leftRoot.id) : new Set<string>();
    const rightIds = rightRoot ? subtreeIds(rightRoot.id) : new Set<string>();

    return NextResponse.json({
      me: {
        id: me.id,
        name: me.name,
        referralCode: me.referralCode,
        walletAvailable: me.wallet?.balanceAvailable ?? 0,
        walletPending: me.wallet?.balancePending ?? 0,
        walletPaidLifetime: me.wallet?.balancePaidLifetime ?? 0,
      },
      team: {
        direct: directs.length,
        left: leftIds.size,
        right: rightIds.size,
        total: snapshot.totalMembers,
        teamSalesPaise: snapshot.totalTeamSalesPaise,
        commissionPaise: snapshot.totalCommissionPaise,
      },
    });
  } catch (e) {
    return mobileServerError("affiliate.summary", e);
  }
}
