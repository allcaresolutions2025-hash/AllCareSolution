import Link from "next/link";
import { prisma } from "@/lib/db";
import { getProMaxNetworkSnapshot } from "@/lib/network-promax";
import { formatPoints } from "@/lib/money";
import { type TreePerson } from "@/components/binary-tree-graph";
import { BinaryTreeZoomable } from "@/components/binary-tree-zoomable";
import { Users, Layers, Crown, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Genealogy" };

// Admin view of Pin Pro Max across the tree. Pro Max overlays the main binary
// tree (members upgrade in place), so this renders the system tree with each
// node's Pro Max points + the root's Pro Max leg counts.
export default async function AdminProMaxGenealogyPage() {
  const roots = await prisma.user.findMany({
    where: { role: "CUSTOMER", referrerId: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      referralCode: true,
      isActive: true,
      gender: true,
      proMaxLeftLegCount: true,
      proMaxRightLegCount: true,
      wallet: { select: { proMaxBalanceAvailable: true } },
    },
  });

  if (roots.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="h-6 w-6 text-amber-500" /> Pro Max Genealogy
        </h1>
        <div className="card p-10 text-center text-sm text-muted-foreground">
          No root member found in the system yet.
        </div>
      </div>
    );
  }

  const leader = roots[0];
  const otherRoots = roots.slice(1);

  const snapshot = await getProMaxNetworkSnapshot(leader.id);
  const totalMembers = snapshot.totalMembers + 1;
  const maxDepth = snapshot.nodes.length > 0 ? Math.max(...snapshot.nodes.map((n) => n.depth)) : 0;

  // Count how many members across the tree are Pro Max, and per-node Pro Max points.
  const downlineIds = snapshot.nodes.map((n) => n.id);
  const [wallets, proMaxCount] = await Promise.all([
    downlineIds.length
      ? prisma.wallet.findMany({
          where: { userId: { in: downlineIds } },
          select: { userId: true, proMaxBalanceAvailable: true },
        })
      : Promise.resolve([]),
    prisma.user.count({ where: { id: { in: [leader.id, ...downlineIds] }, isProMax: true } }),
  ]);
  const pointsByUser = new Map(wallets.map((w) => [w.userId, w.proMaxBalanceAvailable]));

  const treePeople: TreePerson[] = [
    {
      id: leader.id,
      name: leader.name,
      email: leader.email,
      referralCode: leader.referralCode,
      referrerId: null,
      depth: 0,
      isActive: leader.isActive,
      gender: leader.gender,
      pointsPaise: leader.wallet?.proMaxBalanceAvailable ?? 0,
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
          <Crown className="h-6 w-6 text-amber-500" /> Pro Max Genealogy
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          The system binary tree with Pin Pro Max overlaid — each node shows its Pro Max points.
          Pro Max members earn up the tree as their team upgrades.
        </p>
      </div>

      {otherRoots.length > 0 && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>{otherRoots.length} other root account(s)</strong> exist besides {leader.name}:
            <div className="mt-1.5 flex flex-wrap gap-2">
              {otherRoots.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/network/${r.id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/70 hover:bg-white rounded text-xs font-mono"
                >
                  {r.referralCode} · {r.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Root card */}
      <div className="card p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-white/20 grid place-items-center text-2xl font-bold">★</div>
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-100 mb-0.5">System Root</div>
              <div className="text-xl font-bold">{leader.name}</div>
              <div className="text-sm text-amber-50">
                <span className="font-mono">{leader.referralCode}</span> · {leader.email}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-amber-100">Pro Max points</div>
            <div className="text-2xl font-bold tabular-nums">{formatPoints(leader.wallet?.proMaxBalanceAvailable ?? 0)}</div>
            <div className="text-xs text-amber-100 mt-1">Pro Max L {leader.proMaxLeftLegCount} · R {leader.proMaxRightLegCount}</div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi icon={<Users className="h-5 w-5" />} label="Total members" value={String(totalMembers)} sub={`${proMaxCount} Pro Max`} />
        <Kpi icon={<Crown className="h-5 w-5" />} label="Pro Max members" value={String(proMaxCount)} sub="in this tree" />
        <Kpi icon={<Layers className="h-5 w-5" />} label="Tree depth" value={`${maxDepth} ${maxDepth === 1 ? "level" : "levels"}`} sub="deepest path" />
      </div>

      <BinaryTreeZoomable people={treePeople} />
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 grid place-items-center">{icon}</div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}{sub && ` · ${sub}`}</div>
    </div>
  );
}
