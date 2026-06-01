import { prisma } from "@/lib/db";
import { RequestRow } from "./request-row";

export const dynamic = "force-dynamic";

export default async function AdminTxnPasswordRequestsPage() {
  const requests = await prisma.txnPasswordResetRequest.findMany({
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
    include: { user: { select: { id: true, name: true, email: true, phone: true, referralCode: true } } },
    take: 200,
  });
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Transaction Password Resets</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Members who&apos;ve forgotten their transaction password ask here. Approving resets it to
        their registered mobile and flags them to choose a new one on next sign-in.
        {pendingCount > 0 && <> · <strong>{pendingCount} pending</strong></>}
      </p>
      <div className="card overflow-x-auto">
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
    </div>
  );
}
