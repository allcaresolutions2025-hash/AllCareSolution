import { prisma } from "@/lib/db";
import { formatPoints } from "@/lib/money";
import { istDateString } from "@/lib/daily-payout";
import { Clock, CheckCircle2, Coins, Download, RotateCcw } from "lucide-react";
import { PendingPayoutsTable } from "./pending-payouts-table";
import { SimulateMidnightButton } from "./simulate-midnight-button";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminDailyPayoutsPage({
  searchParams,
}: {
  searchParams: { paidPage?: string };
}) {
  // Unpaid is a *today only* view: the moment the next IST day's cron runs,
  // restored users get re-evaluated for fresh pending payouts, so yesterday's
  // unpaid rows should fall off this page (they remain in the DB for audit).
  // Match by runDate prefix so synthetic test runs like "2026-05-27-test-1"
  // also count as "today".
  const todayIst = istDateString();
  const paidPage = Math.max(1, parseInt(searchParams.paidPage ?? "1", 10) || 1);

  const [pending, totalsPending, paid, paidTotal, unpaid, paidTotals] = await Promise.all([
    prisma.dailyPayout.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            referralCode: true,
            leftLegCount: true,
            rightLegCount: true,
          },
        },
      },
    }),
    prisma.dailyPayout.aggregate({
      where: { status: "PENDING" },
      _sum: { paidAmount: true, forfeitAmount: true },
    }),
    prisma.dailyPayout.findMany({
      where: { status: "PAID" },
      orderBy: [{ paidAt: "desc" }, { runDate: "desc" }],
      skip: (paidPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true, referralCode: true } } },
    }),
    prisma.dailyPayout.count({ where: { status: "PAID" } }),
    prisma.dailyPayout.findMany({
      where: {
        status: "CANCELLED",
        runDate: { startsWith: todayIst },
      },
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
          Every night at 00:00 IST the cron job pays out 90% of each user&apos;s available points
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
        <div className="p-5 border-b flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold">Pending ({pending.length})</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download this list before disbursing — send the money offline using the bank details, then return here and mark each row paid.
            </p>
          </div>
          {pending.length > 0 && (
            <a
              href="/api/admin/daily-payouts/export-pending"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 shrink-0"
            >
              <Download className="h-3.5 w-3.5" /> Download Excel (pending)
            </a>
          )}
        </div>
        <PendingPayoutsTable
          payouts={pending.map((p) => ({
            id: p.id,
            runDate: p.runDate,
            userName: p.user.name,
            userEmail: p.user.email,
            userCode: p.user.referralCode,
            leftLegCount: p.user.leftLegCount,
            rightLegCount: p.user.rightLegCount,
            startBalance: p.startBalance,
            paidAmount: p.paidAmount,
            forfeitAmount: p.forfeitAmount,
            proMax: p.proMax,
          }))}
        />
      </div>

      {/* Payouts (paid) — bank-transfer register, downloadable as Excel */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold">Payouts ({paidTotal})</h2>
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
                      {p.paidAt?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono">{p.runDate}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium flex items-center gap-2">
                        {p.user.name}
                        {p.proMax && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            PRO MAX
                          </span>
                        )}
                      </div>
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
        {paidTotal > 0 && (
          <Pagination
            page={paidPage}
            pageParam="paidPage"
            pageSize={PAGE_SIZE}
            total={paidTotal}
            basePath="/admin/daily-payouts"
          />
        )}
      </div>

      {/* Unpaid — balance was restored, not finalized */}
      {unpaid.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-700" /> Unpaid today ({unpaid.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Balances were restored back to the users. This list clears at the
              next midnight IST run — restored users will be re-evaluated for
              fresh pending payouts. Excluded from the Excel register.
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
                      {p.updatedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
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
