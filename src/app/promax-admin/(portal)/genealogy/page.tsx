import Link from "next/link";
import { prisma } from "@/lib/db";
import { getProMaxNetworkSnapshot } from "@/lib/network-promax";
import { formatPoints } from "@/lib/money";
import { type TreePerson } from "@/components/binary-tree-graph";
import { BinaryTreeZoomable } from "@/components/binary-tree-zoomable";
import { Users, Layers, GitBranch } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Genealogy" };

// Admin view of the Pro Max trees. In the separate-account model each Pro Max
// root is an isProMax user with no Pro Max parent (proMaxReferrerId = null).
export default async function ProMaxAdminGenealogyPage({
  searchParams,
}: {
  searchParams: { root?: string };
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
          <GitBranch className="h-6 w-6 text-promax-600" /> Pro Max Genealogy
        </h1>
        <div className="card p-10 text-center text-sm text-muted-foreground">
          No Pro Max root member yet. Register one under <Link href="/promax-admin/register-member" className="text-promax-700 hover:underline">Register Member</Link>.
        </div>
      </div>
    );
  }

  const selected = roots.find((r) => r.id === searchParams.root) ?? roots[0];

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
          <GitBranch className="h-6 w-6 text-promax-600" /> Pro Max Genealogy
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Each node shows its Pro Max points. Switch between Pro Max root trees below.
        </p>
      </div>

      {roots.length > 1 && (
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Pro Max roots</div>
          <div className="flex flex-wrap gap-2">
            {roots.map((r) => (
              <Link
                key={r.id}
                href={`/promax-admin/genealogy?root=${r.id}`}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono ${
                  r.id === selected.id ? "bg-promax-600 text-white" : "bg-promax-50 text-promax-700 hover:bg-promax-100"
                }`}
              >
                {r.referralCode} · {r.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5 bg-promax-gradient text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-white/20 grid place-items-center text-2xl font-bold">★</div>
            <div>
              <div className="text-xs uppercase tracking-wider text-promax-100 mb-0.5">Pro Max Root</div>
              <div className="text-xl font-bold">{selected.name}</div>
              <div className="text-sm text-promax-50">
                <span className="font-mono">{selected.referralCode}</span> · {selected.email}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-promax-100">Pro Max points</div>
            <div className="text-2xl font-bold tabular-nums">{formatPoints(selected.wallet?.proMaxBalanceAvailable ?? 0)}</div>
            <div className="text-xs text-promax-100 mt-1">L {selected.proMaxLeftLegCount} · R {selected.proMaxRightLegCount}</div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Kpi icon={<Users className="h-5 w-5" />} label="Members in tree" value={String(totalMembers)} />
        <Kpi icon={<Layers className="h-5 w-5" />} label="Tree depth" value={`${maxDepth} ${maxDepth === 1 ? "level" : "levels"}`} />
      </div>

      <BinaryTreeZoomable people={treePeople} />
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="h-9 w-9 rounded-lg bg-promax-100 text-promax-700 grid place-items-center">{icon}</div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
