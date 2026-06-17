import { prisma } from "@/lib/db";
import { RequestRow } from "./request-row";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminTxnPasswordRequestsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const [total, pendingCount, requests] = await Promise.all([
    prisma.txnPasswordResetRequest.count(),
    prisma.txnPasswordResetRequest.count({ where: { status: "PENDING" } }),
    prisma.txnPasswordResetRequest.findMany({
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      include: { user: { select: { id: true, name: true, email: true, phone: true, referralCode: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Transaction Password Resets</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Members who&apos;ve forgotten their transaction password ask here. Approving resets it to
        their registered mobile and flags them to choose a new one on next sign-in.
        {pendingCount > 0 && <> · <strong>{pendingCount} pending</strong></>}
      </p>
      <div className="card">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Member</th>
              <th className="px-4 py-2 font-medium">Mobile</th>
              <th className="px-4 py-2 font-medium">Member ID</th>
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
                requestedAt={r.requestedAt.toISOString()}
                status={r.status}
                reviewerNotes={r.reviewerNotes}
                reviewedAt={r.reviewedAt?.toISOString() ?? null}
              />
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No reset requests.</td></tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/txn-password-requests"
        />
      </div>
    </div>
  );
}
