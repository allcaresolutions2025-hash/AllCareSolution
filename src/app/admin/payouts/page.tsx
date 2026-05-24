import { prisma } from "@/lib/db";
import { formatPoints } from "@/lib/money";
import { PayoutRow } from "./payout-row";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const requests = await prisma.payoutRequest.findMany({
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
    include: {
      user: { select: { name: true, email: true, phone: true } },
    },
    take: 200,
  });

  const totalPending = requests
    .filter((r) => r.status === "REQUESTED")
    .reduce((s, r) => s + r.amountNet, 0);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Payout requests</h1>
          <p className="text-sm text-muted-foreground">
            Total pending net payout: <strong>{formatPoints(totalPending)}</strong>
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
      <div className="card overflow-x-auto">
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
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No payout requests.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
