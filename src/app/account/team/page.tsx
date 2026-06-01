import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNetworkSnapshot, type DownlineNode } from "@/lib/network";
import { formatINR, formatINRCompact } from "@/lib/money";
import { Users, TrendingUp, Wallet, UserCheck, Layers } from "lucide-react";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [user, snapshot] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    getNetworkSnapshot(session.user.id),
  ]);

  const referralCode = user?.referralCode ?? "";
  const directs = snapshot.summary.find((s) => s.level === 1)?.members ?? 0;
  const activeMembers = snapshot.nodes.filter((n) => n.isActive).length;
  const maxDepth = snapshot.nodes.length > 0 ? Math.max(...snapshot.nodes.map((n) => n.depth)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Team</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          People who joined ACHT MART through your referral link, and through theirs — up to 15 levels deep.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Users className="h-5 w-5" />} label="Total team" value={String(snapshot.totalMembers)} sub={`${activeMembers} active`} />
        <Kpi icon={<UserCheck className="h-5 w-5" />} label="Direct referrals" value={String(directs)} sub="Level 1" />
        <Kpi icon={<Layers className="h-5 w-5" />} label="Tree depth" value={`${maxDepth} ${maxDepth === 1 ? "level" : "levels"}`} sub="deepest path" />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Team product sales" value={formatINRCompact(snapshot.totalTeamSalesPaise)} />
        <Kpi icon={<Wallet className="h-5 w-5" />} label="Commissions from team" value={formatINRCompact(snapshot.totalCommissionPaise)} />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">Share your Refer ID</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Accounts are created by ACHT MART admin via membership pins. Share this Refer ID with anyone
          who wants to join you on the Left or Right — admin places them in your team using it.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input readOnly className="input font-mono text-sm font-bold tracking-wide" value={referralCode} />
          <CopyButton text={referralCode} />
        </div>
      </div>

      {snapshot.totalMembers === 0 ? (
        <div className="card p-8 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No one in your team yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Share your referral link above. When someone signs up through it, they&apos;ll show up at Level 1.
          </p>
        </div>
      ) : (
        <TreeView nodes={snapshot.nodes} />
      )}
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="h-9 w-9 rounded-lg bg-brand-100 text-brand-700 grid place-items-center">{icon}</div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}{sub && ` · ${sub}`}</div>
    </div>
  );
}

function TreeView({ nodes }: { nodes: DownlineNode[] }) {
  const byParent = new Map<string | null, DownlineNode[]>();
  const minDepth = Math.min(...nodes.map((n) => n.depth));
  for (const n of nodes) {
    const key = n.depth === minDepth ? null : n.referrerId;
    const arr = byParent.get(key);
    if (arr) arr.push(n);
    else byParent.set(key, [n]);
  }
  const roots = byParent.get(null) ?? [];

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">Your downline tree</h2>
      <ul className="space-y-1">
        {roots.map((r) => (
          <TreeNode key={r.id} node={r} byParent={byParent} />
        ))}
      </ul>
    </div>
  );
}

function TreeNode({ node, byParent }: { node: DownlineNode; byParent: Map<string | null, DownlineNode[]> }) {
  const children = byParent.get(node.id) ?? [];
  return (
    <li>
      <details open={node.depth <= 2} className="group">
        <summary className="flex flex-wrap items-baseline gap-x-3 gap-y-1 cursor-pointer py-1.5 px-2 -mx-2 rounded hover:bg-muted">
          <span className="text-xs font-mono text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">L{node.depth}</span>
          <span className="font-medium">{node.name}</span>
          {!node.isActive && <span className="text-xs text-red-600">(inactive)</span>}
          <span className="text-xs text-muted-foreground">{node.email}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {node.orderCount} order{node.orderCount === 1 ? "" : "s"} · {formatINR(node.salesPaise)} sales
            {node.commissionToRootPaise > 0 && <> · <span className="text-brand-700">+{formatINR(node.commissionToRootPaise)}</span></>}
          </span>
        </summary>
        {children.length > 0 && (
          <ul className="ml-4 pl-4 border-l border-muted space-y-1 mt-1">
            {children.map((c) => (
              <TreeNode key={c.id} node={c} byParent={byParent} />
            ))}
          </ul>
        )}
      </details>
    </li>
  );
}
