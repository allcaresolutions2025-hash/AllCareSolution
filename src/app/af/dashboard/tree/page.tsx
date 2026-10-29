import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAfDownline } from "@/lib/af";
import { type DownlineNode } from "@/lib/network";
import { formatPoints } from "@/lib/money";
import { BinaryTreeGraph, type TreePerson } from "@/components/binary-tree-graph";
import { Users, ArrowLeftRight, Layers, GitFork, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "AF Tree" };

export default async function AfTreePage({ searchParams }: { searchParams?: { rootId?: string } }) {
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
      packageAccount: { select: { packageTotal: true, leftBv: true, rightBv: true } },
    },
  });
  if (!me) return null;

  const nodes = await getAfDownline(me.id);
  const maxDepth = nodes.length ? Math.max(...nodes.map((n) => n.depth)) : 0;

  // `?rootId=…` re-centres the view on an account inside the caller's own AF
  // downline so they can keep drilling past the depth cutoff.
  const drillRoot = searchParams?.rootId ? nodes.find((n) => n.id === searchParams.rootId) ?? null : null;

  // Each card shows the account's approved package total.
  const ids = nodes.map((n) => n.id);
  const accounts = ids.length
    ? await prisma.packageAccount.findMany({ where: { userId: { in: ids } }, select: { userId: true, packageTotal: true } })
    : [];
  const packageByUser = new Map(accounts.map((a) => [a.userId, a.packageTotal]));

  const childrenByParent = new Map<string, DownlineNode[]>();
  for (const n of nodes) {
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

  const toPerson = (n: DownlineNode, depthOffset: number): TreePerson => ({
    id: n.id,
    name: n.name,
    email: n.email,
    referralCode: n.referralCode,
    referrerId: n.referrerId,
    slot: n.slot,
    depth: n.depth - depthOffset,
    isActive: n.isActive,
    gender: n.gender,
    createdAt: n.createdAt,
    pointsPaise: packageByUser.get(n.id) ?? 0,
  });

  const treePeople: TreePerson[] = drillRoot
    ? [
        { ...toPerson(drillRoot, drillRoot.depth), referrerId: null, isRoot: true },
        ...nodes.filter((n) => n.id !== drillRoot.id && subtreeIds.has(n.id)).map((n) => toPerson(n, drillRoot.depth)),
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
          pointsPaise: me.packageAccount?.packageTotal ?? 0,
          isRoot: true,
        },
        ...nodes.map((n) => toPerson(n, 0)),
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitFork className="h-6 w-6 text-af-600" /> AF Tree
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your AF binary tree. Each card shows that account&apos;s approved package points. Click an open L+ / R+ slot
          to request a new AF account there. Tap an account with more below it to drill deeper.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4 bg-af-soft border-af-200">
          <div className="h-14 w-14 rounded-full bg-af-100 text-af-700 grid place-items-center text-xl font-bold">
            {me.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{me.name}</div>
            <div className="text-xs mt-1">
              AF ID <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-af-200">{me.referralCode}</code>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowLeftRight className="h-4 w-4" /> Carry-forward BV
          </div>
          <div className="mt-2 text-3xl font-bold tabular-nums text-af-700">
            {me.packageAccount?.leftBv ?? 0} L / {me.packageAccount?.rightBv ?? 0} R
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            My packages: {formatPoints(me.packageAccount?.packageTotal ?? 0)}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-4 w-4" /> AF downline
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div className="text-3xl font-bold tabular-nums">{nodes.length}</div>
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {maxDepth} {maxDepth === 1 ? "level" : "levels"} deep
            </div>
          </div>
        </div>
      </div>

      {drillRoot && (
        <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
          <div className="text-muted-foreground">
            Viewing downline under <span className="font-semibold text-slate-900">{drillRoot.name}</span>{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{drillRoot.referralCode}</code>
          </div>
          <Link href="/af/dashboard/tree" className="inline-flex items-center gap-1 text-af-700 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to your tree
          </Link>
        </div>
      )}

      <BinaryTreeGraph
        people={treePeople}
        allowNodeClick={false}
        addMemberPath="/af/dashboard/add-member"
        drilldownHrefBuilder={(id) => `/af/dashboard/tree?rootId=${id}`}
      />
    </div>
  );
}
