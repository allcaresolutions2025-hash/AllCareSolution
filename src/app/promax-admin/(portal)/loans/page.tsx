import { prisma } from "@/lib/db";
import { formatRupees } from "@/lib/loan";
import { LoanActions } from "./loan-actions";
import { ReceiptActions } from "./receipt-actions";
import { BadgeIndianRupee } from "lucide-react";
import type { LoanStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Loans" };

export default async function ProMaxAdminLoansPage() {
  const [pending, receipts, active] = await Promise.all([
    prisma.loan.findMany({
      where: { proMax: true, status: "REQUESTED" },
      orderBy: { requestedAt: "asc" },
      include: { user: { select: { name: true, referralCode: true, phone: true, whatsappNumber: true, proMaxLeftLegCount: true, proMaxRightLegCount: true } } },
    }),
    prisma.loanInstallment.findMany({
      where: { status: "RECEIPT_UPLOADED", loan: { proMax: true, status: "APPROVED" } },
      orderBy: { uploadedAt: "asc" },
      include: { loan: { select: { tierKey: true, user: { select: { name: true, referralCode: true } } } } },
    }),
    prisma.loan.findMany({
      where: { proMax: true, status: { in: ["APPROVED", "CLOSED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, referralCode: true } }, _count: { select: { installments: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BadgeIndianRupee className="h-6 w-6 text-promax-600" /> Loans
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Approve Pro Max loan requests (disbursed to the member&apos;s Pin Wallet) and verify weekly repayment receipts.
        </p>
      </div>

      {/* Pending requests */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b flex items-center gap-2">
          <h2 className="font-semibold">Loan requests</h2>
          {pending.length > 0 && <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{pending.length} pending</span>}
        </div>
        {pending.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No pending loan requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Requested</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium text-center">Pro Max L/R</th>
                  <th className="px-4 py-2 font-medium">WhatsApp</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{l.requestedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{l.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{l.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-center text-xs tabular-nums">{l.user.proMaxLeftLegCount} / {l.user.proMaxRightLegCount}</td>
                    <td className="px-4 py-2 text-xs font-mono">{l.user.whatsappNumber ?? l.user.phone ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatRupees(l.amount)}</td>
                    <td className="px-4 py-2"><LoanActions id={l.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipts to verify */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b flex items-center gap-2">
          <h2 className="font-semibold">Repayment receipts</h2>
          {receipts.length > 0 && <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{receipts.length} to verify</span>}
        </div>
        {receipts.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No receipts awaiting verification.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Uploaded</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium text-center">Week</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.uploadedAt?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) ?? "—"}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.loan.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{r.loan.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-center tabular-nums">{r.weekNumber}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatRupees(r.amount)}</td>
                    <td className="px-4 py-2"><ReceiptActions id={r.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent loans */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b"><h2 className="font-semibold">Recent loans</h2></div>
        {active.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No loans yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium text-right">Weeks</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {active.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-4 py-2">
                      <div className="font-medium">{l.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{l.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-right font-medium">{formatRupees(l.amount)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{l._count.installments}</td>
                    <td className="px-4 py-2"><StatusBadge status={l.status} /></td>
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

function StatusBadge({ status }: { status: LoanStatus }) {
  const map: Record<LoanStatus, { label: string; cls: string }> = {
    REQUESTED: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
    APPROVED: { label: "Active", cls: "bg-emerald-100 text-emerald-700" },
    REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-700" },
    CLOSED: { label: "Cleared", cls: "bg-sky-100 text-sky-700" },
  };
  const m = map[status];
  return <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
}
