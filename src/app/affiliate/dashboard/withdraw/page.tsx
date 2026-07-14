import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPoints } from "@/lib/money";
import { Pagination } from "@/components/pagination";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { WithdrawForm } from "./withdraw-form";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function WithdrawPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const [user, kyc, wallet, pending, total, requests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { bankAccountNumber: true, bankIfsc: true },
    }),
    prisma.kycDetail.findUnique({
      where: { userId: session.user.id },
      select: { bankAccount: true, ifsc: true },
    }),
    prisma.wallet.findUnique({
      where: { userId: session.user.id },
      select: { balanceAvailable: true },
    }),
    prisma.payoutRequest.findFirst({
      where: { userId: session.user.id, status: "REQUESTED" },
      select: { id: true },
    }),
    prisma.payoutRequest.count({ where: { userId: session.user.id } }),
    prisma.payoutRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const balanceAvailable = wallet?.balanceAvailable ?? 0;
  const hasBankDetails = Boolean(
    (kyc?.bankAccount && kyc?.ifsc) || (user?.bankAccountNumber && user?.bankIfsc),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Withdraw Points</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Request admin to withdraw your earning points to your bank. Minimum{" "}
          <strong>500 pts</strong> must be available. The full amount is held immediately; a{" "}
          <strong>10% deduction</strong> applies and you receive <strong>90%</strong> offline by admin
          once approved.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <WithdrawForm
          balanceAvailable={balanceAvailable}
          hasBankDetails={hasBankDetails}
          hasPending={Boolean(pending)}
        />

        <div className="card p-5">
          <div className="text-xs text-muted-foreground">Available to withdraw</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{formatPoints(balanceAvailable)}</div>
          <p className="mt-3 text-xs text-muted-foreground">
            This is your earning (e-wallet) balance. The nightly daily payout still runs on any points
            you don&apos;t manually withdraw.
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Withdrawal history</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No withdrawal requests yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Requested</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {r.requestedAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">
                      {formatPoints(r.amountNet)}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {r.status === "PAID" && r.utr ? (
                        <span className="font-mono">UTR {r.utr}</span>
                      ) : r.status === "REJECTED" && r.reviewerNotes ? (
                        r.reviewerNotes
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              basePath="/affiliate/dashboard/withdraw"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PAID") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  }
  if (status === "REJECTED" || status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-red-100 text-red-800 border-red-200">
        <XCircle className="h-3 w-3" /> {status === "FAILED" ? "Failed" : "Rejected"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-200">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}
