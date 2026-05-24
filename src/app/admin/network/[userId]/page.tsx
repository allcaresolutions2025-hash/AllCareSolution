import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getNetworkSnapshot } from "@/lib/network";
import { formatPoints } from "@/lib/money";
import { type TreePerson } from "@/components/binary-tree-graph";
import { BinaryTreeZoomable } from "@/components/binary-tree-zoomable";
import { ArrowLeft, Users, UserCheck, Coins, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({ params }: { params: { userId: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      referralCode: true,
      isActive: true,
      role: true,
      createdAt: true,
      wallet: { select: { balanceAvailable: true, balancePending: true, balancePaidLifetime: true } },
      gender: true,
      referrer: { select: { id: true, name: true, referralCode: true } },
      _count: { select: { referrals: true, orders: true } },
    },
  });
  if (!user) notFound();

  const snapshot = await getNetworkSnapshot(user.id);
  const directs = snapshot.summary.find((s) => s.level === 1)?.members ?? 0;
  const activeMembers = snapshot.nodes.filter((n) => n.isActive).length;
  const maxDepth = snapshot.nodes.length > 0 ? Math.max(...snapshot.nodes.map((n) => n.depth)) : 0;

  // Fetch points (wallet.balanceAvailable) for every node in one query.
  const downlineIds = snapshot.nodes.map((n) => n.id);
  const downlineWallets = downlineIds.length
    ? await prisma.wallet.findMany({
        where: { userId: { in: downlineIds } },
        select: { userId: true, balanceAvailable: true },
      })
    : [];
  const pointsByUser = new Map(downlineWallets.map((w) => [w.userId, w.balanceAvailable]));

  const treePeople: TreePerson[] = [
    {
      id: user.id,
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
      referrerId: null,
      depth: 0,
      isActive: user.isActive,
      gender: user.gender,
      pointsPaise: user.wallet?.balanceAvailable ?? 0,
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
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Users
      </Link>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <div className="text-sm text-muted-foreground mt-1 space-x-3">
              <span>{user.email}</span>
              {user.phone && <><span>·</span><span>{user.phone}</span></>}
              <span>·</span>
              <span>
                Code <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{user.referralCode}</code>
              </span>
              {user.role === "ADMIN" && <span className="text-amber-700">· ADMIN</span>}
              {!user.isActive && <span className="text-red-600">· inactive</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {user.referrer ? (
                <>
                  Sponsored by{" "}
                  <Link href={`/admin/network/${user.referrer.id}`} className="hover:underline text-brand-700">
                    {user.referrer.name} ({user.referrer.referralCode})
                  </Link>
                </>
              ) : (
                <>Top-level (no sponsor)</>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Joined {user.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Coins className="h-5 w-5" />} label="Points (available)" value={formatPoints(user.wallet?.balanceAvailable ?? 0)} />
        <Kpi icon={<Users className="h-5 w-5" />} label="Total downline" value={String(snapshot.totalMembers)} sub={`${activeMembers} active`} />
        <Kpi icon={<UserCheck className="h-5 w-5" />} label="Direct referrals" value={String(directs)} sub="L1 pair" />
        <Kpi icon={<Layers className="h-5 w-5" />} label="Tree depth" value={`${maxDepth} ${maxDepth === 1 ? "level" : "levels"}`} sub={`max 50`} />
      </div>

      {snapshot.summary.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="font-semibold">Depth levels below this user</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Points: <strong>+200</strong> as the direct referrer of each new joiner, plus a one-time
              <strong> +500</strong> the moment both Left and Right direct slots first fill, plus
              <strong> +200 per pair match</strong> as new pairs form in the downline
              (100 pts for matches more than 15 levels below).
              In the tree below, the badge prefix shows side: <strong className="text-emerald-700">L</strong> = Left slot, <strong className="text-sky-700">R</strong> = Right slot.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">Depth</th>
                  <th className="text-right px-5 py-2 font-medium">Members</th>
                  <th className="text-right px-5 py-2 font-medium">Active</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.summary.map((s) => (
                  <tr key={s.level} className="border-t">
                    <td className="px-5 py-2 font-medium">Depth {s.level}</td>
                    <td className="text-right px-5 py-2">{s.members}</td>
                    <td className="text-right px-5 py-2">{s.activeMembers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BinaryTreeZoomable people={treePeople} />
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
