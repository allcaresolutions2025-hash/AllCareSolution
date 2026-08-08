import Link from "next/link";
import { prisma } from "@/lib/db";
import { Search, ArrowRightLeft } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { RequestRow } from "./request-row";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pin Wallet Top-Up Requests" };

const PAGE_SIZE = 20;
const STATUSES = ["PENDING", "APPROVED", "REJECTED", "REVOKED"] as const;
type Status = (typeof STATUSES)[number];

export default async function AdminPinWalletRequestsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const status = STATUSES.includes(searchParams.status as Status)
    ? (searchParams.status as Status)
    : undefined;

  const where: Prisma.PinTopUpAccessRequestWhereInput = {
    ...(status ? { status } : {}),
    ...(q
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
      : {}),
  };

  const [total, pendingCount, activeCount, requests] = await Promise.all([
    prisma.pinTopUpAccessRequest.count({ where }),
    prisma.pinTopUpAccessRequest.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { pinTopUpEnabled: true } }),
    prisma.pinTopUpAccessRequest.findMany({
      where,
      // Pending first so the queue is always actionable from the top, then
      // newest-first within each status.
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, referralCode: true, pinTopUpEnabled: true },
        },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  // Preserved across pagination links so filters survive a page change.
  const params = { q: q || undefined, status };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6 text-brand-600" />
          Pin Wallet Top-Up Requests
        </h1>
        <p className="text-sm text-muted-foreground">
          Members ask here before they can move points from their payout wallet into their Pin
          Wallet. Approving switches the transfer on for that member; you can revoke it any time.
          {pendingCount > 0 && (
            <>
              {" "}· <strong>{pendingCount} pending</strong>
            </>
          )}
          {" "}· <strong>{activeCount}</strong> member{activeCount === 1 ? "" : "s"} currently active
        </p>
      </div>

      <form className="card p-4 mb-4 flex flex-wrap items-center gap-2" action="" method="get">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, phone, or AM ID…"
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
          <Link href="/admin/pin-wallet-requests" className="btn-outline">
            Clear
          </Link>
        )}
      </form>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium">Member ID</th>
                <th className="px-4 py-2 font-medium">Mobile</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Requested</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <RequestRow
                  key={r.id}
                  id={r.id}
                  user={r.user}
                  reason={r.reason}
                  status={r.status}
                  adminNote={r.adminNote}
                  createdAt={r.createdAt.toISOString()}
                  reviewedAt={r.reviewedAt?.toISOString() ?? null}
                  revokedAt={r.revokedAt?.toISOString() ?? null}
                />
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No activation requests{q || status ? " match this filter" : " yet"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/pin-wallet-requests"
          params={params}
        />
      </div>
    </div>
  );
}
