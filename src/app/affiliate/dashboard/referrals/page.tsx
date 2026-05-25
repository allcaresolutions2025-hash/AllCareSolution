import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNetworkSnapshot, type DownlineNode } from "@/lib/network";
import { formatPoints } from "@/lib/money";
import { BinaryTreeGraph, type TreePerson } from "@/components/binary-tree-graph";
import { Users, Coins, Layers, BadgeCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GenealogyPage() {
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
      createdAt: true,
      gender: true,
      wallet: { select: { balanceAvailable: true } },
    },
  });
  if (!me) return null;

  const snapshot = await getNetworkSnapshot(me.id);

  // Identify Left and Right directs by the actual slot field — not creation
  // order, which would swap the cards whenever the right slot was filled first.
  const directs = snapshot.nodes.filter((n) => n.depth === 1);
  const leftRoot: DownlineNode | undefined = directs.find((n) => n.slot === "LEFT");
  const rightRoot: DownlineNode | undefined = directs.find((n) => n.slot === "RIGHT");

  // Compute subtree sizes for Team L and Team R.
  const childrenByParent = new Map<string, DownlineNode[]>();
  for (const n of snapshot.nodes) {
    if (!n.referrerId) continue;
    const arr = childrenByParent.get(n.referrerId);
    if (arr) arr.push(n);
    else childrenByParent.set(n.referrerId, [n]);
  }
  function subtreeCount(rootId: string): number {
    let total = 1;
    const stack = [rootId];
    while (stack.length) {
      const id = stack.pop()!;
      const kids = childrenByParent.get(id) ?? [];
      for (const k of kids) {
        total += 1;
        stack.push(k.id);
      }
    }
    return total;
  }
  const teamLCount = leftRoot ? subtreeCount(leftRoot.id) : 0;
  const teamRCount = rightRoot ? subtreeCount(rightRoot.id) : 0;
  const maxDepth = snapshot.nodes.length ? Math.max(...snapshot.nodes.map((n) => n.depth)) : 0;

  // Fetch each downline member's own points for the tree nodes.
  const downlineIds = snapshot.nodes.map((n) => n.id);
  const wallets = downlineIds.length
    ? await prisma.wallet.findMany({
        where: { userId: { in: downlineIds } },
        select: { userId: true, balanceAvailable: true },
      })
    : [];
  const pointsByUser = new Map(wallets.map((w) => [w.userId, w.balanceAvailable]));

  const treePeople: TreePerson[] = [
    {
      id: me.id,
      name: me.name,
      email: me.email,
      referralCode: me.referralCode,
      referrerId: null,
      depth: 0,
      isActive: me.isActive,
      gender: me.gender,
      pointsPaise: me.wallet?.balanceAvailable ?? 0,
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
        <h1 className="text-2xl font-bold">Genealogy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your binary tree — every member added below you, on both sides, up to 15 levels deep.
        </p>
      </div>

      {/* Profile + KPI strip */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xl font-bold">
            {me.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{me.name}</div>
            <div className="text-xs text-muted-foreground truncate">{me.email}</div>
            <div className="text-xs mt-1">
              Code <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{me.referralCode}</code>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Coins className="h-4 w-4" /> Your points
          </div>
          <div className="mt-2 text-3xl font-bold tabular-nums text-brand-700">
            {formatPoints(me.wallet?.balanceAvailable ?? 0)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            +200 per direct referral · +500 one-time when both your L &amp; R slots first fill · +200 per pair match in your downline (100 pts past depth 15)
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-4 w-4" /> Total downline
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div className="text-3xl font-bold tabular-nums">{snapshot.totalMembers}</div>
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Layers className="h-3 w-3" />{maxDepth} {maxDepth === 1 ? "level" : "levels"} deep
            </div>
          </div>
        </div>
      </div>

      {/* Team L / Team R — like Team A BV / Team B BV in your reference */}
      <div className="grid sm:grid-cols-2 gap-4">
        <TeamCard
          side="Left"
          color="emerald"
          rootName={leftRoot?.name}
          count={teamLCount}
          empty={!leftRoot}
          referralCode={me.referralCode}
        />
        <TeamCard
          side="Right"
          color="sky"
          rootName={rightRoot?.name}
          count={teamRCount}
          empty={!rightRoot}
          referralCode={me.referralCode}
        />
      </div>

      {/* Full SVG tree — real nodes are view-only for members */}
      <BinaryTreeGraph people={treePeople} allowNodeClick={false} />
    </div>
  );
}

function TeamCard({
  side,
  color,
  rootName,
  count,
  empty,
  referralCode,
}: {
  side: "Left" | "Right";
  color: "emerald" | "sky";
  rootName?: string;
  count: number;
  empty: boolean;
  referralCode: string;
}) {
  const tone =
    color === "emerald"
      ? { ring: "ring-emerald-200", chip: "bg-emerald-100 text-emerald-800", value: "text-emerald-700" }
      : { ring: "ring-sky-200", chip: "bg-sky-100 text-sky-800", value: "text-sky-700" };
  return (
    <div className={`card p-5 ring-1 ${tone.ring}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${tone.chip}`}>Team {side}</span>
        <BadgeCheck className={`h-4 w-4 ${tone.value}`} />
      </div>
      {empty ? (
        <>
          <div className="mt-4 text-sm font-medium">Empty slot</div>
          <div className="text-xs text-muted-foreground mt-1">
            Share <code className="font-mono bg-muted px-1 rounded">{referralCode}</code> to fill this side.
          </div>
        </>
      ) : (
        <>
          <div className={`mt-4 text-3xl font-bold tabular-nums ${tone.value}`}>{count}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            members · headed by {rootName}
          </div>
        </>
      )}
    </div>
  );
}
