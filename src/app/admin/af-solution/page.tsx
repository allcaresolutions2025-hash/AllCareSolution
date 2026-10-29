import Link from "next/link";
import { prisma } from "@/lib/db";
import { Search, Crown, UserPlus } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { formatPoints } from "@/lib/money";
import { getLastMatchingRunDate, getPackageConfig } from "@/lib/package-plan";
import { istDateString } from "@/lib/daily-payout";
import { PackageRow, RunMatchingButton } from "./package-row";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "AF Solution" };

const PAGE_SIZE = 20;
const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
type Status = (typeof STATUSES)[number];

export default async function AdminAfSolutionPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const status = STATUSES.includes(searchParams.status as Status) ? (searchParams.status as Status) : undefined;

  const where: Prisma.PackagePurchaseWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          user: {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { phone: { contains: q } },
              { referralCode: { contains: q.toUpperCase() } },
            ],
          },
        }
      : {}),
  };

  const since = new Date(Date.now() - 30 * 86_400_000);
  const [cfg, lastRun, total, pendingCount, activeCount, revenue, paid, purchases] = await Promise.all([
    getPackageConfig(),
    getLastMatchingRunDate(),
    prisma.packagePurchase.count({ where }),
    prisma.packagePurchase.count({ where: { status: "PENDING" } }),
    prisma.packageAccount.count({ where: { active: true } }),
    prisma.packagePurchase.aggregate({
      where: { status: "APPROVED", reviewedAt: { gte: since } },
      _sum: { amount: true },
    }),
    prisma.packageEarning.aggregate({
      where: { type: { in: ["DIRECT", "BINARY"] }, createdAt: { gte: since } },
      _sum: { amount: true },
    }),
    prisma.packagePurchase.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { user: { select: { name: true, referralCode: true, phone: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const revenue30 = revenue._sum.amount ?? 0;
  const paid30 = paid._sum.amount ?? 0;
  const ceiling30 = Math.floor((revenue30 * cfg.payoutCeilingPercent) / 100);
  const ceilingUse = ceiling30 > 0 ? Math.round((paid30 / ceiling30) * 100) : 0;
  const params = { q: q || undefined, status };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Crown className="h-6 w-6 text-af-600" />
            AF Solution — Packages
          </h1>
          <p className="text-sm text-muted-foreground">
            Verify each AF account&apos;s package request, then approve it. Approval activates its package points, sends
            the BV up the AF tree and pays the direct bonus. Ship the product from here too.
            {pendingCount > 0 && (
              <>
                {" "}· <strong>{pendingCount} pending</strong>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/af-id-requests" className="btn-outline inline-flex items-center gap-1.5">
            <UserPlus className="h-4 w-4" /> AF ID requests
          </Link>
          <RunMatchingButton ranToday={lastRun === istDateString()} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Active AF accounts" value={activeCount.toLocaleString("en-IN")} />
        <Stat label="Approved packages (30d)" value={formatPoints(revenue30)} />
        <Stat label="Paid out (30d)" value={formatPoints(paid30)} sub={`Ceiling ${formatPoints(ceiling30)} · ${ceilingUse}% used`} />
        <Stat label="Last catch-up run" value={lastRun ?? "Never"} sub="Matching pays on approval · catch-up 23:30 IST" />
      </div>

      <div className="card p-4 mb-4 text-xs text-muted-foreground">
        Current rules: BV {cfg.bvPercent}% of price · direct {cfg.directPercent}% of BV · pair matching {cfg.binaryPercent}% of
        matched BV, paid on approval · daily cap {cfg.dailyCapMultiplier}× package · carry-forward {cfg.carryExpiryDays} days · payout
        ceiling {cfg.payoutCeilingPercent}% of 30-day approved package points.{" "}
        <Link href="/admin/settings" className="underline">
          Change in Settings
        </Link>
      </div>

      <form className="card p-4 mb-4 flex flex-wrap items-center gap-2" action="" method="get">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, phone or AF ID…"
          className="input flex-1 min-w-[200px]"
        />
        <select name="status" defaultValue={status ?? ""} className="input w-auto">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          Search
        </button>
        {(q || status) && (
          <Link href="/admin/af-solution" className="btn-outline">
            Clear
          </Link>
        )}
      </form>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">AF account</th>
                <th className="px-4 py-2 font-medium">Package</th>
                <th className="px-4 py-2 font-medium">Product &amp; delivery</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <PackageRow
                  key={p.id}
                  row={{
                    id: p.id,
                    user: p.user,
                    amountLabel: formatPoints(p.amount),
                    bv: p.bv,
                    productName: p.productName,
                    shipName: p.shipName,
                    shipPhone: p.shipPhone,
                    shipAddress: p.shipAddress,
                    status: p.status,
                    deliveryStatus: p.deliveryStatus,
                    trackingNumber: p.trackingNumber,
                    adminNote: p.adminNote,
                    createdAt: p.createdAt.toISOString(),
                  }}
                />
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No package requests{q || status ? " match this filter" : " yet"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/af-solution" params={params} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4 min-w-0">
      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums truncate">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
