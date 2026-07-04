import { prisma } from "@/lib/db";
import { RewardStatusActions } from "./reward-status-actions";
import { proMaxRewardPinWalletPoints } from "@/lib/rewards-promax";
import { Trophy } from "lucide-react";
import type { RewardClaimStatus } from "@prisma/client";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Rewards" };

const OPEN_STATUSES: RewardClaimStatus[] = ["PENDING", "APPROVED", "DISPATCHED"];
const PAGE_SIZE = 20;

export default async function ProMaxAdminRewardsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const [openTotal, pending, open, recent] = await Promise.all([
    prisma.proMaxReward.count({ where: { status: { in: OPEN_STATUSES } } }),
    prisma.proMaxReward.count({ where: { status: "PENDING" } }),
    prisma.proMaxReward.findMany({
      where: { status: { in: OPEN_STATUSES } },
      orderBy: [{ status: "asc" }, { requestedAt: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, referralCode: true } } },
    }),
    prisma.proMaxReward.findMany({
      where: { status: { in: ["DELIVERED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, referralCode: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-promax-600" /> Rewards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Members unlock rewards by filling their Pro Max tree to each level. Approve claims to dispatch them;
          levels 1-6 auto-credit Pin Wallet points on approval.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b flex items-center gap-2">
          <h2 className="font-semibold">Open claims</h2>
          {pending > 0 && <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{pending} pending</span>}
        </div>
        {open.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No open claims.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Claimed</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Level</th>
                  <th className="px-4 py-2 font-medium">Reward</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {open.map((r) => {
                  const pts = proMaxRewardPinWalletPoints(r.level);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {r.requestedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{r.user.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{r.user.referralCode}</div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-promax-100 text-promax-800">
                          {r.level === 0 ? "Welcome" : `L${r.level}`}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {r.rewardName}
                        {pts > 0 && <div className="text-[11px] text-emerald-700">+{pts.toLocaleString("en-IN")} pts on approve</div>}
                      </td>
                      <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-2"><RewardStatusActions id={r.id} status={r.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {openTotal > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={openTotal} basePath="/promax-admin/rewards" />
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b"><h2 className="font-semibold">Recent history</h2></div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No completed claims yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium">Level</th>
                <th className="px-4 py-2 font-medium">Reward</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {r.updatedAt.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.user.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{r.user.referralCode}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">{r.level === 0 ? "Welcome" : `L${r.level}`}</td>
                  <td className="px-4 py-2">{r.rewardName}</td>
                  <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RewardClaimStatus }) {
  const map: Record<RewardClaimStatus, { label: string; cls: string }> = {
    PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
    APPROVED: { label: "Approved", cls: "bg-promax-100 text-promax-800" },
    DISPATCHED: { label: "Dispatched", cls: "bg-sky-100 text-sky-700" },
    DELIVERED: { label: "Delivered", cls: "bg-emerald-100 text-emerald-700" },
    REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status];
  return <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}
