import { prisma } from "@/lib/db";
import { formatPoints } from "@/lib/money";
import { MIN_PAYOUT_POINTS } from "@/lib/daily-payout";
import { PendingPayoutsTable } from "@/app/admin/daily-payouts/pending-payouts-table";
import { RunPayoutButton } from "./run-payout-button";
import { Coins, Clock } from "lucide-react";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Daily Payouts" };

const PAGE_SIZE = 20;

export default async function ProMaxDailyPayoutsPage({ searchParams }: { searchParams: { paidPage?: string } }) {
  const paidPage = Math.max(1, parseInt(searchParams.paidPage ?? "1", 10) || 1);

  const [pending, owed, paid, paidTotal] = await Promise.all([
    prisma.dailyPayout.findMany({
      where: { status: "PENDING", proMax: true },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            name: true, email: true, referralCode: true, proMaxLeftLegCount: true, proMaxRightLegCount: true,
            loans: { where: { proMax: true, status: "APPROVED" }, select: { id: true }, take: 1 },
          },
        },
      },
    }),
    prisma.dailyPayout.aggregate({ where: { status: "PENDING", proMax: true }, _sum: { paidAmount: true } }),
    prisma.dailyPayout.findMany({
      where: { status: "PAID", proMax: true },
      orderBy: [{ paidAt: "desc" }, { runDate: "desc" }],
      skip: (paidPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, referralCode: true } } },
    }),
    prisma.dailyPayout.count({ where: { status: "PAID", proMax: true } }),
  ]);

  const rows = pending.map((p) => ({
    id: p.id,
    runDate: p.runDate,
    userName: p.user.name,
    userEmail: p.user.email,
    userCode: p.user.referralCode,
    leftLegCount: p.user.proMaxLeftLegCount,
    rightLegCount: p.user.proMaxRightLegCount,
    startBalance: p.startBalance,
    paidAmount: p.paidAmount,
    forfeitAmount: p.forfeitAmount,
    proMax: false, // suppress the redundant "PRO MAX" badge inside the Pro Max portal
    hasLoan: p.user.loans.length > 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Coins className="h-6 w-6 text-promax-600" /> Daily Payouts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Run the payout when you&apos;re ready — there is no automatic nightly run. Each run pays 90% of every
            eligible Pro Max member&apos;s wallet (≥ {MIN_PAYOUT_POINTS} pts) and resets the balance to 0. Disburse
            offline, then mark each row paid.
          </p>
        </div>
        <RunPayoutButton />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Kpi icon={<Clock className="h-5 w-5" />} label="Pending payouts" value={String(pending.length)} />
        <Kpi icon={<Coins className="h-5 w-5" />} label="Owed (pending)" value={formatPoints(owed._sum.paidAmount ?? 0)} />
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b"><h2 className="font-semibold">Pending ({pending.length})</h2></div>
        <PendingPayoutsTable payouts={rows} apiBase="/api/promax-admin/daily-payouts" />
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b"><h2 className="font-semibold">Paid ({paidTotal})</h2></div>
        {paid.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No paid payouts yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Paid at</th>
                  <th className="px-4 py-2 font-medium">Run Date</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium text-right">Payout</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{p.paidAt?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) ?? "—"}</td>
                    <td className="px-4 py-2 text-xs font-mono">{p.runDate}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{p.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{p.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-right font-bold tabular-nums text-promax-700">{formatPoints(p.paidAmount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatPoints(p.startBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {paidTotal > PAGE_SIZE && (
          <Pagination page={paidPage} pageParam="paidPage" pageSize={PAGE_SIZE} total={paidTotal} basePath="/promax-admin/daily-payouts" />
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="h-9 w-9 rounded-lg grid place-items-center bg-promax-100 text-promax-700">{icon}</div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
