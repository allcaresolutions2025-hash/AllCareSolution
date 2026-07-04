import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPoints } from "@/lib/money";
import { Coins, Clock, CheckCircle2 } from "lucide-react";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function MyDailyPayoutsPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  // Members only see PAID payouts in their history — pending and unpaid
  // (admin-restored) rows are an internal/admin concern.
  const [total, payouts, totals] = await Promise.all([
    prisma.dailyPayout.count({ where: { userId: session.user.id, status: "PAID" } }),
    prisma.dailyPayout.findMany({
      where: { userId: session.user.id, status: "PAID" },
      orderBy: { runDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.dailyPayout.groupBy({
      by: ["status"],
      where: { userId: session.user.id },
      _sum: { paidAmount: true },
    }),
  ]);

  const sum = (s: "PENDING" | "PAID" | "CANCELLED") =>
    totals.find((t) => t.status === s)?._sum.paidAmount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Daily Payouts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          At 12:00 AM IST every day, if your balance is <strong>at least 500 pts</strong>, 90% is paid out
          to you (offline by admin) and 10% is forfeited. Your balance then resets to 0, and you start
          earning again as your team grows. Balances below 500 pts roll over to the next day.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi icon={<Clock className="h-5 w-5" />} label="Awaiting payout" value={formatPoints(sum("PENDING"))} tone="amber" />
        <Kpi icon={<CheckCircle2 className="h-5 w-5" />} label="Paid lifetime" value={formatPoints(sum("PAID"))} tone="emerald" />
        <Kpi icon={<Coins className="h-5 w-5" />} label="Forfeited (10%)" value={formatPoints(payouts.reduce((acc, p) => acc + p.forfeitAmount, 0))} tone="slate" />
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Only finalized (paid) payouts are listed here.
          </p>
        </div>
        {payouts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No paid payouts yet — they appear here once admin marks the disbursal complete.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Run Date</th>
                  <th className="px-4 py-2 font-medium text-right">Start Balance</th>
                  <th className="px-4 py-2 font-medium text-right">Paid (90%)</th>
                  <th className="px-4 py-2 font-medium text-right">Forfeit (10%)</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{p.runDate}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {formatPoints(p.startBalance)}
                    </td>
                    <td className="px-4 py-2 text-right font-bold tabular-nums text-brand-700">
                      {formatPoints(p.paidAmount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {formatPoints(p.forfeitAmount)}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/affiliate/dashboard/daily-payouts" />
          </div>
        )}
      </div>
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
  tone: "amber" | "emerald" | "slate";
}) {
  const toneMap = {
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="card p-5">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${toneMap[tone]}`}>{icon}</div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
