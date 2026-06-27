import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProMaxNetworkSnapshot } from "@/lib/network-promax";
import { formatPoints } from "@/lib/money";
import { BinaryTreeGraph, type TreePerson } from "@/components/binary-tree-graph";
import { Users, Coins, Layers, GitFork } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Genealogy" };

export default async function ProMaxMemberTreePage() {
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

  const downlineIds = snapshot.nodes.map((n) => n.id);
  const wallets = downlineIds.length
    ? await prisma.wallet.findMany({
        where: { userId: { in: downlineIds } },
        select: { userId: true, proMaxBalanceAvailable: true },
      })
    : [];
  const pointsByUser = new Map(wallets.map((w) => [w.userId, w.proMaxBalanceAvailable]));

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
          Your 10,000-pt binary tree. Tap an open slot to register a new member.
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

      <BinaryTreeGraph
        people={treePeople}
        allowNodeClick={false}
        addMemberPath="/promax/dashboard/add-member"
      />
    </div>
  );
}
