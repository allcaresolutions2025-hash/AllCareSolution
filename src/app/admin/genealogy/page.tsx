import Link from "next/link";
import { prisma } from "@/lib/db";
import { getNetworkSnapshot } from "@/lib/network";
import { formatPoints } from "@/lib/money";
import { type TreePerson } from "@/components/binary-tree-graph";
import { BinaryTreeZoomable } from "@/components/binary-tree-zoomable";
import { Users, Layers, Coins, GitBranch, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminGenealogyPage() {
  // Find every root in the customer tree (referrerId is null and role = CUSTOMER).
  // Normally there is exactly one — the system leader (e.g., Priya).
  const roots = await prisma.user.findMany({
    where: { role: "CUSTOMER", referrerId: null },
    orderBy: { createdAt: "asc" },
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

  if (roots.length === 0) {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-2xl font-bold mb-2">Genealogy</h1>
        <p className="text-sm text-muted-foreground">
          No root member found in the system yet.
        </p>
      </div>
    );
  }

  // Use the first (oldest) root as the leader. Other roots, if any, are shown as a warning.
  const leader = roots[0];
  const otherRoots = roots.slice(1);

  const snapshot = await getNetworkSnapshot(leader.id);
  const totalMembers = snapshot.totalMembers + 1; // +1 for the leader herself
  const maxDepth = snapshot.nodes.length > 0 ? Math.max(...snapshot.nodes.map((n) => n.depth)) : 0;
  const activeCount = 1 + snapshot.nodes.filter((n) => n.isActive).length;

  // Fetch wallet balances for every downline member in one query.
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
      id: leader.id,
      name: leader.name,
      email: leader.email,
      referralCode: leader.referralCode,
      referrerId: null,
      depth: 0,
      isActive: leader.isActive,
      gender: leader.gender,
      pointsPaise: leader.wallet?.balanceAvailable ?? 0,
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
          Full system tree starting from the leader. Use the controls in the corner to zoom in, zoom out, or expand to fullscreen.
        </p>
      </div>

      {otherRoots.length > 0 && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>{otherRoots.length} other root account(s)</strong> exist in the system besides {leader.name}.
            These users have no sponsor and form their own trees:
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

      {/* Leader card */}
      <div className="card p-5 bg-gradient-to-br from-brand-700 to-emerald-900 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-white/20 grid place-items-center text-2xl font-bold">
              ★
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-brand-200 mb-0.5">System Leader (Root)</div>
              <div className="text-xl font-bold">{leader.name}</div>
              <div className="text-sm text-brand-100">
                <span className="font-mono">{leader.referralCode}</span> · {leader.email}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-brand-200">Leader&apos;s points</div>
            <div className="text-2xl font-bold tabular-nums">{formatPoints(leader.wallet?.balanceAvailable ?? 0)}</div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Users className="h-5 w-5" />} label="Total members" value={String(totalMembers)} sub={`${activeCount} active`} />
        <Kpi icon={<GitBranch className="h-5 w-5" />} label="Downline" value={String(snapshot.totalMembers)} sub="below leader" />
        <Kpi icon={<Layers className="h-5 w-5" />} label="Tree depth" value={`${maxDepth} ${maxDepth === 1 ? "level" : "levels"}`} sub="deepest path" />
        <Kpi icon={<Coins className="h-5 w-5" />} label="Network sales" value={formatPoints(snapshot.totalTeamSalesPaise)} sub="paid orders" />
      </div>

      {/* The expandable tree */}
      <BinaryTreeZoomable people={treePeople} />

      {/* Quick depth summary */}
      {snapshot.summary.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="font-semibold">Members by level</h2>
            <p className="text-xs text-muted-foreground">How many members sit at each depth below the leader.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">Level</th>
                  <th className="text-right px-5 py-2 font-medium">Members</th>
                  <th className="text-right px-5 py-2 font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.summary.map((s) => (
                  <tr key={s.level} className="border-t">
                    <td className="px-5 py-2 font-medium">Level {s.level}</td>
                    <td className="text-right px-5 py-2">{s.members}</td>
                    <td className="text-right px-5 py-2">{s.activeMembers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="h-9 w-9 rounded-lg bg-brand-100 text-brand-700 grid place-items-center">{icon}</div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}{sub && ` · ${sub}`}</div>
    </div>
  );
}
