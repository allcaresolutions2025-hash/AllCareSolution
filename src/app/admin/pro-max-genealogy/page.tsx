import Link from "next/link";
import { prisma } from "@/lib/db";
import { getProMaxNetworkSnapshot } from "@/lib/network-promax";
import { formatPoints } from "@/lib/money";
import { type TreePerson } from "@/components/binary-tree-graph";
import { BinaryTreeZoomable } from "@/components/binary-tree-zoomable";
import { Users, Layers, Crown } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Genealogy" };

// Admin view of the SEPARATE Pin Pro Max trees. Each Pro Max root (a member who
// started a Pro Max tree) has its own independent tree of new Pro Max users.
export default async function AdminProMaxGenealogyPage({
  searchParams,
}: {
  searchParams?: { rootId?: string };
}) {
  const roots = await prisma.user.findMany({
    where: { isProMax: true, proMaxReferrerId: null },
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
          No Pro Max trees yet.
        </div>
      </div>
    );
  }

  const selected = roots.find((r) => r.id === searchParams?.rootId) ?? roots[0];

  const snapshot = await getProMaxNetworkSnapshot(selected.id);
  const totalMembers = snapshot.totalMembers + 1;
  const maxDepth = snapshot.nodes.length > 0 ? Math.max(...snapshot.nodes.map((n) => n.depth)) : 0;

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
      id: selected.id,
      name: selected.name,
      email: selected.email,
      referralCode: selected.referralCode,
      referrerId: null,
      depth: 0,
      isActive: selected.isActive,
      gender: selected.gender,
      pointsPaise: selected.wallet?.proMaxBalanceAvailable ?? 0,
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
          The separate Pin Pro Max trees. Pick a root below; use the corner controls to zoom or go fullscreen.
        </p>
      </div>

      {roots.length > 1 && (
        <div className="card p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Pro Max trees ({roots.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {roots.map((r) => {
              const active = r.id === selected.id;
              return (
                <Link
                  key={r.id}
                  href={`/admin/pro-max-genealogy?rootId=${r.id}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50"
                  }`}
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span className="font-mono">{r.referralCode}</span> · {r.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Root card */}
      <div className="card p-5 bg-gradient-to-br from-amber-500 to-amber-700 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-white/20 grid place-items-center text-2xl font-bold">★</div>
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-100 mb-0.5">Pro Max Root</div>
              <div className="text-xl font-bold">{selected.name}</div>
              <div className="text-sm text-amber-50">
                <span className="font-mono">{selected.referralCode}</span> · {selected.email}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-amber-100">Pro Max points</div>
            <div className="text-2xl font-bold tabular-nums">{formatPoints(selected.wallet?.proMaxBalanceAvailable ?? 0)}</div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi icon={<Users className="h-5 w-5" />} label="Total members" value={String(totalMembers)} sub="incl. root" />
        <Kpi icon={<Crown className="h-5 w-5" />} label="Pro Max downline" value={String(snapshot.totalMembers)} sub="below root" />
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
