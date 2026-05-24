import { prisma } from "@/lib/db";
import { formatPoints } from "@/lib/money";
import { Clock, CheckCircle2, Coins, Download, RotateCcw } from "lucide-react";
import { PendingPayoutsTable } from "./pending-payouts-table";
import { SimulateMidnightButton } from "./simulate-midnight-button";

export const dynamic = "force-dynamic";

export default async function AdminDailyPayoutsPage() {
  const [pending, totalsPending, paid, unpaid, paidTotals] = await Promise.all([
    prisma.dailyPayout.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true, referralCode: true } } },
    }),
    prisma.dailyPayout.aggregate({
      where: { status: "PENDING" },
      _sum: { paidAmount: true, forfeitAmount: true },
    }),
    prisma.dailyPayout.findMany({
      where: { status: "PAID" },
      orderBy: [{ paidAt: "desc" }, { runDate: "desc" }],
      take: 100,
      include: { user: { select: { name: true, email: true, referralCode: true } } },
    }),
    prisma.dailyPayout.findMany({
      where: { status: "CANCELLED" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, email: true, referralCode: true } } },
    }),
    prisma.dailyPayout.aggregate({
      where: { status: "PAID" },
      _sum: { paidAmount: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Points Payouts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every night at 00:00 IST the cron job pays out 90% of each user's available points
          and resets their balance to 0 — but only for users with at least 500 pts.
          Sub-500 balances keep accumulating until they cross the threshold. Disburse offline, then mark as paid.
        </p>
      </div>

      <SimulateMidnightButton />

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi icon={<Clock className="h-5 w-5" />} label="Pending payouts" value={pending.length} tone="amber" />
        <Kpi icon={<Coins className="h-5 w-5" />} label="Owed (pending)" value={formatPoints(totalsPending._sum.paidAmount ?? 0)} tone="sky" />
        <Kpi icon={<CheckCircle2 className="h-5 w-5" />} label="Paid lifetime" value={formatPoints(paidTotals._sum.paidAmount ?? 0)} tone="emerald" />
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Pending ({pending.length})</h2>
        </div>
        <PendingPayoutsTable
          payouts={pending.map((p) => ({
            id: p.id,
            runDate: p.runDate,
            userName: p.user.name,
            userEmail: p.user.email,
            userCode: p.user.referralCode,
            startBalance: p.startBalance,
            paidAmount: p.paidAmount,
            forfeitAmount: p.forfeitAmount,
          }))}
        />
      </div>

      {/* Payouts (paid) — bank-transfer register, downloadable as Excel */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold">Payouts ({paid.length})</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Finalized payouts ready to be sent to the bank.
            </p>
          </div>
          <a
            href="/api/admin/daily-payouts/export"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700"
          >
            <Download className="h-3.5 w-3.5" /> Download Excel
          </a>
        </div>
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
                  <th className="px-4 py-2 font-medium text-right">Payout Points</th>
                  <th className="px-4 py-2 font-medium text-right">Discounted</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {p.paidAt?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{p.runDate}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{p.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{p.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-right font-bold tabular-nums text-brand-700">{formatPoints(p.paidAmount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatPoints(p.forfeitAmount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatPoints(p.startBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unpaid — balance was restored, not finalized */}
      {unpaid.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-700" /> Unpaid ({unpaid.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Balances were restored back to the users. Excluded from the Excel register.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Updated</th>
                  <th className="px-4 py-2 font-medium">Run Date</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium text-right">Restored</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {p.updatedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{p.runDate}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{p.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{p.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatPoints(p.startBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "amber" | "emerald" | "sky";
}) {
  const toneMap = {
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    sky: "bg-sky-100 text-sky-700",
  };
  return (
    <div className="card p-5">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${toneMap[tone]}`}>{icon}</div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
