import { prisma } from "@/lib/db";
import { RewardRow } from "./reward-row";
import { Trophy, Download, PackageCheck } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { ResetPendingRewardsCard } from "./reset-pending-card";
import { WELCOME_KIT_LEVEL } from "@/lib/rewards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reward Claims" };

const STATUS_ORDER = ["PENDING", "APPROVED", "DISPATCHED", "DELIVERED", "REJECTED"] as const;
const PAGE_SIZE = 20;

export default async function AdminRewardsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; dpage?: string };
}) {
  const filterStatus = STATUS_ORDER.includes(searchParams.status as (typeof STATUS_ORDER)[number])
    ? (searchParams.status as (typeof STATUS_ORDER)[number])
    : undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const dpage = Math.max(1, parseInt(searchParams.dpage ?? "1", 10) || 1);

  const claims = await prisma.rewardClaim.findMany({
    where: filterStatus ? { status: filterStatus } : undefined,
    orderBy: { requestedAt: "desc" },
    include: {
      user: { select: { name: true, email: true, phone: true, referralCode: true } },
    },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  // Welcome Kit (level 0) is the only physical reward to dispatch.
  const [wkApprovedCount, deliveredWelcomeKits, deliveredWkTotal] = await Promise.all([
    prisma.rewardClaim.count({ where: { level: WELCOME_KIT_LEVEL, status: "APPROVED" } }),
    prisma.rewardClaim.findMany({
      where: { level: WELCOME_KIT_LEVEL, status: "DELIVERED" },
      orderBy: { updatedAt: "desc" },
      skip: (dpage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, phone: true, referralCode: true, address: true } } },
    }),
    prisma.rewardClaim.count({ where: { level: WELCOME_KIT_LEVEL, status: "DELIVERED" } }),
  ]);

  const counts = await prisma.rewardClaim.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count.id]));
  const total = Object.values(countMap).reduce((a, b) => a + b, 0);
  // Total rows for the active filter — drives the pagination bar.
  const filteredTotal = filterStatus ? (countMap[filterStatus] ?? 0) : total;

  const tabs: { label: string; value: string | undefined; count: number }[] = [
    { label: "All", value: undefined, count: total },
    { label: "Pending", value: "PENDING", count: countMap["PENDING"] ?? 0 },
    { label: "Approved", value: "APPROVED", count: countMap["APPROVED"] ?? 0 },
    { label: "Dispatched", value: "DISPATCHED", count: countMap["DISPATCHED"] ?? 0 },
    { label: "Delivered", value: "DELIVERED", count: countMap["DELIVERED"] ?? 0 },
    { label: "Rejected", value: "REJECTED", count: countMap["REJECTED"] ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Trophy className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-bold">Reward Claims</h1>
        {countMap["PENDING"] > 0 && (
          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            {countMap["PENDING"]} pending
          </span>
        )}
        <a
          href="/api/admin/rewards/welcome-kit-export"
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700"
        >
          <Download className="h-3.5 w-3.5" /> Welcome Kit dispatch list ({wkApprovedCount})
        </a>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Welcome Kit is the only physical reward — the dispatch list (Excel, with member address) covers
        approved Welcome Kits. The L1-15 rewards are credited to the member&apos;s Pin Wallet on approval.
      </p>

      {/* One-time cleanup: clear pending claims so members re-request under the new rule */}
      <ResetPendingRewardsCard />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = filterStatus === tab.value;
          const href = tab.value ? `/admin/rewards?status=${tab.value}` : "/admin/rewards";
          return (
            <a
              key={tab.label}
              href={href}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                active
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-muted-foreground border-slate-200 hover:border-brand-300"
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground"}`}>
                {tab.count}
              </span>
            </a>
          );
        })}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Gift</th>
              <th className="px-4 py-3 font-medium">Requested</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {claims.map((claim) => (
              <RewardRow
                key={claim.id}
                id={claim.id}
                user={claim.user}
                level={claim.level}
                rewardName={claim.rewardName}
                status={claim.status}
                adminNote={claim.adminNote}
                requestedAt={claim.requestedAt.toISOString()}
              />
            ))}
            {claims.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No reward claims yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filteredTotal}
          basePath="/admin/rewards"
          params={{ status: filterStatus }}
        />
      </div>

      {/* Delivered Welcome Kits — physical dispatch tracking */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b flex items-center gap-2">
          <PackageCheck className="h-4 w-4 text-emerald-600" />
          <h2 className="font-semibold">Delivered Welcome Kits</h2>
          <span className="ml-auto text-xs text-muted-foreground">{deliveredWkTotal} delivered</span>
        </div>
        {deliveredWelcomeKits.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No delivered Welcome Kits yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Mobile</th>
                  <th className="px-4 py-2 font-medium">Address</th>
                  <th className="px-4 py-2 font-medium">Delivered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveredWelcomeKits.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2">
                      <div className="font-medium">{c.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{c.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{c.user.phone ?? "—"}</td>
                    <td className="px-4 py-2 text-xs max-w-xs">{c.user.address ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {c.updatedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {deliveredWkTotal > 0 && (
          <Pagination
            page={dpage}
            pageParam="dpage"
            pageSize={PAGE_SIZE}
            total={deliveredWkTotal}
            basePath="/admin/rewards"
            params={{ status: filterStatus, page: page > 1 ? String(page) : undefined }}
          />
        )}
      </div>
    </div>
  );
}
