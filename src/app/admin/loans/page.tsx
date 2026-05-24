import { prisma } from "@/lib/db";
import { BadgeIndianRupee, Clock, FileCheck2 } from "lucide-react";
import { formatRupees, tierByKey } from "@/lib/loan";
import { LoanApprovalRow } from "./loan-approval-row";
import { ReceiptReviewRow } from "./receipt-review-row";

export const dynamic = "force-dynamic";

export default async function AdminLoansPage() {
  const [pendingLoans, pendingReceipts, recentLoans, totalDisbursed] = await Promise.all([
    prisma.loan.findMany({
      where: { status: "REQUESTED" },
      orderBy: { requestedAt: "asc" },
      include: { user: { select: { name: true, email: true, referralCode: true } } },
    }),
    prisma.loanInstallment.findMany({
      where: {
        status: "RECEIPT_UPLOADED",
        loan: { status: "APPROVED" },
      },
      orderBy: { uploadedAt: "asc" },
      include: {
        loan: {
          select: {
            id: true,
            tierKey: true,
            user: { select: { name: true, email: true, referralCode: true } },
          },
        },
      },
    }),
    prisma.loan.findMany({
      where: { status: { in: ["APPROVED", "CLOSED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, email: true, referralCode: true } },
        _count: { select: { installments: true } },
      },
    }),
    prisma.loan.aggregate({
      where: { status: { in: ["APPROVED", "CLOSED"] } },
      _sum: { amount: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loan Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review loan requests, disburse funds offline, and verify weekly receipts.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi icon={<Clock className="h-5 w-5" />} label="Pending loan requests" value={pendingLoans.length} tone="amber" />
        <Kpi icon={<FileCheck2 className="h-5 w-5" />} label="Receipts awaiting review" value={pendingReceipts.length} tone="sky" />
        <Kpi icon={<BadgeIndianRupee className="h-5 w-5" />} label="Total disbursed" value={formatRupees(totalDisbursed._sum.amount ?? 0)} tone="emerald" />
      </div>

      {/* Pending loan requests */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Pending loan requests ({pendingLoans.length})</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Verify the member, hand over the cash offline, then click Approve to issue the repayment schedule.
          </p>
        </div>
        {pendingLoans.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No pending loan requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Requested</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Tier</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium text-right">Weeks</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingLoans.map((l) => (
                  <LoanApprovalRow
                    key={l.id}
                    id={l.id}
                    requestedAt={l.requestedAt.toISOString()}
                    userName={l.user.name}
                    userEmail={l.user.email}
                    userCode={l.user.referralCode}
                    tierLabel={tierByKey(l.tierKey)?.label ?? l.tierKey}
                    amount={l.amount}
                    totalWeeks={l.totalWeeks}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending receipt verifications */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Receipts awaiting verification ({pendingReceipts.length})</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Confirm you received the weekly payment offline, then accept the receipt.
          </p>
        </div>
        {pendingReceipts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No receipts pending review.</div>
        ) : (
          <div className="divide-y">
            {pendingReceipts.map((inst) => (
              <ReceiptReviewRow
                key={inst.id}
                id={inst.id}
                weekNumber={inst.weekNumber}
                amount={inst.amount}
                dueDate={inst.dueDate.toISOString()}
                uploadedAt={inst.uploadedAt?.toISOString() ?? null}
                userName={inst.loan.user.name}
                userCode={inst.loan.user.referralCode}
                tierLabel={tierByKey(inst.loan.tierKey)?.label ?? inst.loan.tierKey}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent history */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Recent loans</h2>
        </div>
        {recentLoans.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No history yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Updated</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Tier</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium text-right">Weeks</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLoans.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {l.updatedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{l.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{l.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-xs">{tierByKey(l.tierKey)?.label ?? l.tierKey}</td>
                    <td className="px-4 py-2 text-right font-bold tabular-nums">{formatRupees(l.amount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{l.totalWeeks}</td>
                    <td className="px-4 py-2">
                      {l.status === "APPROVED" ? <span className="badge-green">Active</span>
                        : l.status === "CLOSED" ? <span className="badge-blue">Cleared</span>
                        : <span className="badge-red">Rejected</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
  tone: "amber" | "emerald" | "brand" | "sky";
}) {
  const toneMap = {
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    brand: "bg-brand-100 text-brand-700",
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
