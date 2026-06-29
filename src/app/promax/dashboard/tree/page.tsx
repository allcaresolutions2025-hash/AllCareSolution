import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProMaxNetworkSnapshot } from "@/lib/network-promax";
import { type DownlineNode } from "@/lib/network";
import { formatPoints } from "@/lib/money";
import Link from "next/link";
import { BinaryTreeGraph, type TreePerson } from "@/components/binary-tree-graph";
import { Users, Coins, Layers, GitFork, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Genealogy" };

export default async function ProMaxMemberTreePage({
  searchParams,
}: {
  searchParams?: { rootId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      referralCode: true,
      isActive: true,
      gender: true,
      wallet: { select: { proMaxBalanceAvailable: true } },
    },
  });
  if (!me) return null;

  const snapshot = await getProMaxNetworkSnapshot(me.id);
  const maxDepth = snapshot.nodes.length ? Math.max(...snapshot.nodes.map((n) => n.depth)) : 0;

  // `?rootId=…` re-centres the visual tree on a member inside the caller's own
  // Pro Max downline, so a leader can keep drilling past the 3-level cutoff and
  // add members deeper. Anything not in the downline falls back to self-as-root.
  const downlineIdSet = new Set(snapshot.nodes.map((n) => n.id));
  const drillRootId =
    searchParams?.rootId && downlineIdSet.has(searchParams.rootId) ? searchParams.rootId : null;
  const drillRoot = drillRootId ? snapshot.nodes.find((n) => n.id === drillRootId) ?? null : null;

  // Per-node Pro Max points for the tree cards.
  const downlineIds = snapshot.nodes.map((n) => n.id);
  const wallets = downlineIds.length
    ? await prisma.wallet.findMany({
        where: { userId: { in: downlineIds } },
        select: { userId: true, proMaxBalanceAvailable: true },
      })
    : [];
  const pointsByUser = new Map(wallets.map((w) => [w.userId, w.proMaxBalanceAvailable]));

  // Walk the drill root's subtree so we can re-stamp depths relative to it.
  const childrenByParent = new Map<string, DownlineNode[]>();
  for (const n of snapshot.nodes) {
    if (!n.referrerId) continue;
    const arr = childrenByParent.get(n.referrerId);
    if (arr) arr.push(n);
    else childrenByParent.set(n.referrerId, [n]);
  }
  const subtreeIds = new Set<string>();
  if (drillRoot) {
    const stack = [drillRoot.id];
    while (stack.length) {
      const id = stack.pop()!;
      subtreeIds.add(id);
      for (const k of childrenByParent.get(id) ?? []) stack.push(k.id);
    }
  }

  const treePeople: TreePerson[] = drillRoot
    ? [
        {
          id: drillRoot.id,
          name: drillRoot.name,
          email: drillRoot.email,
          referralCode: drillRoot.referralCode,
          referrerId: null,
          depth: 0,
          isActive: drillRoot.isActive,
          gender: drillRoot.gender,
          pointsPaise: pointsByUser.get(drillRoot.id) ?? 0,
          isRoot: true,
        },
        ...snapshot.nodes
          .filter((n) => n.id !== drillRoot.id && subtreeIds.has(n.id))
          .map((n) => ({
            id: n.id,
            name: n.name,
            email: n.email,
            referralCode: n.referralCode,
            referrerId: n.referrerId,
            slot: n.slot,
            depth: n.depth - drillRoot.depth,
            isActive: n.isActive,
            gender: n.gender,
            createdAt: n.createdAt,
            pointsPaise: pointsByUser.get(n.id) ?? 0,
          })),
      ]
    : [
        {
          id: me.id,
          name: me.name,
          email: me.email,
          referralCode: me.referralCode,
          referrerId: null,
          depth: 0,
          isActive: me.isActive,
          gender: me.gender,
          pointsPaise: me.wallet?.proMaxBalanceAvailable ?? 0,
          isRoot: true,
        },
        ...snapshot.nodes.map((n) => ({
          id: n.id,
          name: n.name,
          email: n.email,
          referralCode: n.referralCode,
          referrerId: n.referrerId,
          slot: n.slot,
          depth: n.depth,
          isActive: n.isActive,
          gender: n.gender,
          createdAt: n.createdAt,
          pointsPaise: pointsByUser.get(n.id) ?? 0,
        })),
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitFork className="h-6 w-6 text-promax-600" /> Pro Max Genealogy
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your 10,000-pt binary tree. Tap a member with more below to drill deeper, or tap an open slot to add a member.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4 bg-promax-soft border-promax-200">
          <div className="h-14 w-14 rounded-full bg-promax-100 text-promax-700 grid place-items-center text-xl font-bold">
            {me.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{me.name}</div>
            <div className="text-xs text-muted-foreground truncate">{me.email}</div>
            <div className="text-xs mt-1">
              Code <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-promax-200">{me.referralCode}</code>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Coins className="h-4 w-4" /> Pro Max points
          </div>
          <div className="mt-2 text-3xl font-bold tabular-nums text-promax-700">
            {formatPoints(me.wallet?.proMaxBalanceAvailable ?? 0)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            +2,000 per direct · +5,000 both legs filled · +2,000 per pair match (1,000 past depth 15)
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-4 w-4" /> Pro Max downline
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div className="text-3xl font-bold tabular-nums">{snapshot.totalMembers}</div>
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Layers className="h-3 w-3" />{maxDepth} {maxDepth === 1 ? "level" : "levels"} deep
            </div>
          </div>
        </div>
      </div>

      {drillRoot && (
        <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
          <div className="text-muted-foreground">
            Viewing downline under{" "}
            <span className="font-semibold text-slate-900">{drillRoot.name}</span>{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{drillRoot.referralCode}</code>
          </div>
          <Link href="/promax/dashboard/tree" className="inline-flex items-center gap-1 text-promax-700 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to your tree
          </Link>
        </div>
      )}

      <BinaryTreeGraph
        people={treePeople}
        allowNodeClick={false}
        addMemberPath="/promax/dashboard/add-member"
        drilldownHrefBuilder={(id) => `/promax/dashboard/tree?rootId=${id}`}
      />
    </div>
  );
}
