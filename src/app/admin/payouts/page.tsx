import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPoints } from "@/lib/money";
import { PayoutRow } from "./payout-row";
import { Download, Search } from "lucide-react";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminPayoutsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const userFilter = q
    ? {
        user: {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { referralCode: { contains: q.toUpperCase() } },
          ],
        },
      }
    : {};

  // Pending total is computed across ALL matching rows via aggregate — not the
  // current page — so it stays correct as the admin pages through results.
  const [total, pendingAgg, requests] = await Promise.all([
    prisma.payoutRequest.count({ where: userFilter }),
    prisma.payoutRequest.aggregate({
      where: { ...userFilter, status: "REQUESTED" },
      _sum: { amountNet: true },
    }),
    prisma.payoutRequest.findMany({
      where: userFilter,
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      include: {
        user: { select: { name: true, email: true, phone: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPending = pendingAgg._sum.amountNet ?? 0;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            Withdrawal requests{q ? ` — "${q}"` : ""} ({total})
          </h1>
          <p className="text-sm text-muted-foreground">
            Members request to cash out their points; pay offline then mark paid. Total pending:{" "}
            <strong>{formatPoints(totalPending)}</strong>
          </p>
        </div>
        <a
          href="/api/admin/payouts/export"
          className="btn-outline inline-flex items-center gap-2 shrink-0"
          download
        >
          <Download className="h-4 w-4" /> Download Excel
        </a>
      </div>

      <form className="card p-4 mb-4 flex items-center gap-2" action="" method="get">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, phone, or AM ID…"
          className="input flex-1"
        />
        <button type="submit" className="btn-primary">Search</button>
        {q && (
          <Link href="/admin/payouts" className="btn-outline">Clear</Link>
        )}
      </form>

      <div className="card">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Requested</th>
              <th className="px-4 py-2 font-medium text-right">Gross</th>
              <th className="px-4 py-2 font-medium text-right">TDS</th>
              <th className="px-4 py-2 font-medium text-right">Net</th>
              <th className="px-4 py-2 font-medium">Bank</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <PayoutRow
                key={r.id}
                id={r.id}
                user={r.user}
                requestedAt={r.requestedAt.toISOString()}
                amountGross={r.amountGross}
                tdsAmount={r.tdsAmount}
                amountNet={r.amountNet}
                bankSnapshot={r.bankSnapshot}
                status={r.status}
                utr={r.utr}
              />
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                {q ? `No payouts match "${q}".` : "No payout requests."}
              </td></tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/payouts"
          params={{ q }}
        />
      </div>
    </div>
  );
}
