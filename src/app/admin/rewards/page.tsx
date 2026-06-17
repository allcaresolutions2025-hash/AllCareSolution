import { prisma } from "@/lib/db";
import { RewardRow } from "./reward-row";
import { Trophy } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { ResetPendingRewardsCard } from "./reset-pending-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reward Claims" };

const STATUS_ORDER = ["PENDING", "APPROVED", "DISPATCHED", "DELIVERED", "REJECTED"] as const;
const PAGE_SIZE = 20;

export default async function AdminRewardsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const filterStatus = STATUS_ORDER.includes(searchParams.status as (typeof STATUS_ORDER)[number])
    ? (searchParams.status as (typeof STATUS_ORDER)[number])
    : undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const claims = await prisma.rewardClaim.findMany({
    where: filterStatus ? { status: filterStatus } : undefined,
    orderBy: { requestedAt: "desc" },
    include: {
      user: { select: { name: true, email: true, phone: true, referralCode: true } },
    },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

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
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-bold">Reward Claims</h1>
        {countMap["PENDING"] > 0 && (
          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            {countMap["PENDING"]} pending
          </span>
        )}
      </div>

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
    </div>
  );
}
