import Link from "next/link";
import { prisma } from "@/lib/db";
import { Search, UserPlus } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { AfIdRequestRow } from "./id-request-row";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "AF ID Requests" };

const PAGE_SIZE = 20;
const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
type Status = (typeof STATUSES)[number];

export default async function AdminAfIdRequestsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const status = STATUSES.includes(searchParams.status as Status) ? (searchParams.status as Status) : undefined;

  const where: Prisma.AfIdRequestWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { mobile: { contains: q } },
            { createdAfId: { contains: q.toUpperCase() } },
            { requester: { referralCode: { contains: q.toUpperCase() } } },
          ],
        }
      : {}),
  };

  const [total, pendingCount, afCount, requests] = await Promise.all([
    prisma.afIdRequest.count({ where }),
    prisma.afIdRequest.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { isAf: true } }),
    prisma.afIdRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { requester: { select: { name: true, referralCode: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const params = { q: q || undefined, status };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-af-600" />
          AF ID Requests
        </h1>
        <p className="text-sm text-muted-foreground">
          Members request new AF accounts here. Approve to create the account at the placement you choose. The AF ID is
          sent back to the member.
          {pendingCount > 0 && (
            <>
              {" "}· <strong>{pendingCount} pending</strong>
            </>
          )}
          {" "}· <strong>{afCount}</strong> AF account{afCount === 1 ? "" : "s"}
        </p>
      </div>

      <form className="card p-4 mb-4 flex flex-wrap items-center gap-2" action="" method="get">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, mobile, AF ID or member ID…"
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
          <Link href="/admin/af-id-requests" className="btn-outline">
            Clear
          </Link>
        )}
      </form>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Requested by</th>
                <th className="px-4 py-2 font-medium">Account holder</th>
                <th className="px-4 py-2 font-medium">Requested placement</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <AfIdRequestRow
                  key={r.id}
                  row={{
                    id: r.id,
                    requester: r.requester,
                    name: r.name,
                    mobile: r.mobile,
                    email: r.email,
                    sponsorAfId: r.sponsorAfId,
                    side: r.side,
                    note: r.note,
                    status: r.status,
                    adminNote: r.adminNote,
                    createdAfId: r.createdAfId,
                    createdAt: r.createdAt.toISOString(),
                  }}
                />
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No AF ID requests{q || status ? " match this filter" : " yet"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/af-id-requests" params={params} />
      </div>
    </div>
  );
}
