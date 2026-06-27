import { prisma } from "@/lib/db";
import { GrantRewardForm } from "./grant-reward-form";
import { RewardStatusActions } from "./reward-status-actions";
import { Trophy, Crown } from "lucide-react";
import type { RewardClaimStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Rewards" };

export default async function ProMaxAdminRewardsPage() {
  const [comboRequests, recent] = await Promise.all([
    prisma.proMaxReward.findMany({
      where: { kind: "COMBO" },
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      take: 100,
      include: { user: { select: { name: true, referralCode: true } } },
    }),
    prisma.proMaxReward.findMany({
      where: { kind: "LEVEL" },
      orderBy: { requestedAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, referralCode: true } } },
    }),
  ]);

  const pendingCombo = comboRequests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-promax-600" /> Rewards
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Approve Combo Box requests and grant level rewards directly to members.
        </p>
      </div>

      {/* Combo Box requests */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b flex items-center gap-2">
          <Crown className="h-4 w-4 text-promax-700" />
          <h2 className="font-semibold">Combo Box requests</h2>
          {pendingCombo > 0 && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{pendingCombo} pending</span>
          )}
        </div>
        {comboRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No Combo Box requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Requested</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {comboRequests.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {r.requestedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{r.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2"><RewardStatusActions id={r.id} status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GrantRewardForm />

      {/* Recently granted level rewards */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Recently granted rewards</h2>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No rewards granted yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Granted</th>
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium">Reward</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {r.requestedAt.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.user.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{r.user.referralCode}</div>
                  </td>
                  <td className="px-4 py-2">
                    {r.rewardName}
                    {r.adminNote && <div className="text-xs text-muted-foreground">{r.adminNote}</div>}
                  </td>
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
    APPROVED: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
    DISPATCHED: { label: "Dispatched", cls: "bg-sky-100 text-sky-700" },
    DELIVERED: { label: "Delivered", cls: "bg-promax-100 text-promax-700" },
    REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status];
  return <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}
