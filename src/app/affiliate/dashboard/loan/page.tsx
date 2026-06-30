import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { BadgeIndianRupee, Clock, CheckCircle2, XCircle, FileUp, Hourglass } from "lucide-react";
import { formatRupees, tierByKey } from "@/lib/loan";
import { InstallmentRow } from "./installment-row";

export const dynamic = "force-dynamic";

export default async function MyLoanPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [loans, wallet] = await Promise.all([
    prisma.loan.findMany({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
      include: { installments: { orderBy: { weekNumber: "asc" } } },
    }),
    prisma.wallet.findUnique({
      where: { userId: session.user.id },
      select: { pinWalletBalance: true },
    }),
  ]);
  const pinWalletBalance = wallet?.pinWalletBalance ?? 0;

  if (loans.length === 0) {
    return (
      <div className="card p-8 text-center">
        <BadgeIndianRupee className="h-10 w-10 text-muted-foreground mx-auto" />
        <h2 className="mt-3 font-semibold text-lg">No loan yet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Match a tier on your Achieved Offers page to apply for a loan.
        </p>
        <Link
          href="/affiliate/dashboard/achieved-offers"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          View offers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My Loans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your weekly payment receipt, or pay instantly from your Pin Wallet (installment + 9%).
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">
          <span className="text-xs text-muted-foreground">Pin Wallet</span>
          <div className="font-bold tabular-nums text-emerald-700">{formatRupees(pinWalletBalance)} pts</div>
        </div>
      </div>

      {loans.map((loan) => {
        const tier = tierByKey(loan.tierKey);
        return (
          <div key={loan.id} className="card overflow-hidden">
            <div className="p-5 border-b flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{formatRupees(loan.amount)}</span>
                  <StatusBadge status={loan.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {tier?.label ?? loan.tierKey} · {loan.totalWeeks} weeks ·
                  {" "}Applied {loan.requestedAt.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}
                </div>
                {loan.dueDate && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Final due: {loan.dueDate.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}
                  </div>
                )}
                {loan.reviewerNotes && (
                  <div className="text-xs mt-2 px-3 py-1.5 rounded bg-amber-50 text-amber-800 border border-amber-200 inline-block">
                    Admin: {loan.reviewerNotes}
                  </div>
                )}
              </div>
            </div>

            {loan.status === "REQUESTED" && (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Hourglass className="h-8 w-8 text-amber-500" />
                Waiting for admin to verify and disburse this loan offline.
              </div>
            )}

            {loan.status === "REJECTED" && (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <XCircle className="h-8 w-8 text-red-500" />
                This loan request was rejected.
              </div>
            )}

            {(loan.status === "APPROVED" || loan.status === "CLOSED") && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Week</th>
                      <th className="px-4 py-2 font-medium">Due Date</th>
                      <th className="px-4 py-2 font-medium text-right">Amount</th>
                      <th className="px-4 py-2 font-medium text-right">Penalty</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.installments.map((inst) => (
                      <InstallmentRow
                        key={inst.id}
                        id={inst.id}
                        weekNumber={inst.weekNumber}
                        dueDate={inst.dueDate.toISOString()}
                        amount={inst.amount}
                        loanAmount={loan.amount}
                        status={inst.status}
                        hasReceipt={!!inst.receiptBase64}
                        uploadedAt={inst.uploadedAt?.toISOString() ?? null}
                        loanClosed={loan.status === "CLOSED"}
                        rejectedNote={inst.reviewerNotes}
                        pinWalletBalance={pinWalletBalance}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {loan.status === "CLOSED" && (
              <div className="p-4 bg-emerald-50 border-t border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Loan fully cleared — well done.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: "REQUESTED" | "APPROVED" | "REJECTED" | "CLOSED" }) {
  const map = {
    REQUESTED: { label: "Pending Approval", cls: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="h-3 w-3" /> },
    APPROVED:  { label: "Active",            cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <FileUp className="h-3 w-3" /> },
    REJECTED:  { label: "Rejected",          cls: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
    CLOSED:    { label: "Cleared",           cls: "bg-sky-100 text-sky-800 border-sky-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${map.cls}`}>
      {map.icon} {map.label}
    </span>
  );
}
