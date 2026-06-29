import { prisma } from "@/lib/db";
import { BadgeIndianRupee, Clock, CheckCircle2, AlertTriangle, CalendarDays, Receipt } from "lucide-react";
import { formatRupees, tierByKey, daysOverdueIst } from "@/lib/loan";
import { ReceiptReviewRow } from "./receipt-review-row";
import { PendingLoansSection, type PendingLoanRow } from "./pending-loans-section";
import { UnpaidInstallmentsSection, type UnpaidInstallmentRow } from "./unpaid-installments-section";
import { RecentLoansSection } from "./recent-loans-section";
import { PaidTodayRow } from "./paid-today-row";
import { EligibilityAuditCard } from "./eligibility-audit-card";
import { istDateString } from "@/lib/daily-payout";

export const dynamic = "force-dynamic";

// Returns the UTC instants that mark the start of "today" and "tomorrow" in
// IST (Asia/Kolkata). Used to bucket installment dueDates into today / overdue.
function istDayBoundsUtc(): { startUtc: Date; endUtc: Date } {
  const todayIst = istDateString(); // "YYYY-MM-DD" in IST
  // IST is UTC+05:30. IST midnight = UTC of the previous day at 18:30.
  const startUtc = new Date(`${todayIst}T00:00:00+05:30`);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}

export default async function AdminLoansPage() {
  const { startUtc, endUtc } = istDayBoundsUtc();

  const [
    pendingLoans,
    pendingReceipts,
    recentLoans,
    totalDisbursed,
    receivedAgg,
    outstandingAgg,
    dueTodayInstallments,
    overdueInstallments,
    paidTodayInstallments,
  ] = await Promise.all([
    prisma.loan.findMany({
      where: { status: "REQUESTED", proMax: false },
      orderBy: { requestedAt: "asc" },
      include: {
        user: {
          select: {
            name: true, email: true, referralCode: true, phone: true, whatsappNumber: true, panNumber: true,
            leftLegCount: true, rightLegCount: true,
          },
        },
      },
    }),
    prisma.loanInstallment.findMany({
      where: {
        status: "RECEIPT_UPLOADED",
        loan: { status: "APPROVED", proMax: false },
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
      where: { status: { in: ["APPROVED", "CLOSED", "REJECTED"] }, proMax: false },
      orderBy: { updatedAt: "desc" },
      // Loaded in full for client-side search + pagination in RecentLoansSection.
      take: 500,
      include: {
        user: { select: { name: true, email: true, referralCode: true } },
        _count: { select: { installments: true } },
      },
    }),
    prisma.loan.aggregate({
      where: { status: { in: ["APPROVED", "CLOSED"] }, proMax: false },
      _sum: { amount: true },
    }),
    // Repayments received = verified installments across disbursed loans.
    prisma.loanInstallment.aggregate({
      where: { status: "VERIFIED", loan: { status: { in: ["APPROVED", "CLOSED"] }, proMax: false } },
      _sum: { amount: true },
      _count: true,
    }),
    // Repayments still owed = unverified installments on active (approved) loans.
    prisma.loanInstallment.aggregate({
      where: { status: { in: ["PENDING", "RECEIPT_UPLOADED"] }, loan: { status: "APPROVED" } },
      _sum: { amount: true },
      _count: true,
    }),
    // Installments due TODAY (IST) — either PENDING or RECEIPT_UPLOADED.
    prisma.loanInstallment.findMany({
      where: {
        loan: { status: "APPROVED", proMax: false },
        status: { in: ["PENDING", "RECEIPT_UPLOADED"] },
        dueDate: { gte: startUtc, lt: endUtc },
      },
      orderBy: { dueDate: "asc" },
      include: {
        loan: {
          select: {
            id: true,
            tierKey: true,
            amount: true,
            user: { select: { id: true, name: true, email: true, referralCode: true, phone: true, whatsappNumber: true, panNumber: true } },
          },
        },
      },
    }),
    // OVERDUE installments — past due, still PENDING (RECEIPT_UPLOADED means the
    // user has at least submitted a receipt; surface those under the existing
    // "Receipts awaiting verification" section instead).
    prisma.loanInstallment.findMany({
      where: {
        loan: { status: "APPROVED", proMax: false },
        status: "PENDING",
        dueDate: { lt: startUtc },
      },
      orderBy: { dueDate: "asc" },
      include: {
        loan: {
          select: {
            id: true,
            tierKey: true,
            amount: true,
            user: { select: { id: true, name: true, email: true, referralCode: true, phone: true, whatsappNumber: true, panNumber: true } },
          },
        },
      },
    }),
    // Installments VERIFIED today (IST) — the "paid today" view. Includes
    // already-CLOSED loans because today's final installment closes the loan.
    prisma.loanInstallment.findMany({
      where: {
        status: "VERIFIED",
        verifiedAt: { gte: startUtc, lt: endUtc },
        loan: { proMax: false },
      },
      orderBy: { verifiedAt: "desc" },
      select: {
        id: true,
        weekNumber: true,
        amount: true,
        verifiedAt: true,
        receiptMime: true,
        loan: {
          select: {
            tierKey: true,
            user: { select: { name: true, referralCode: true, phone: true } },
          },
        },
      },
    }),
  ]);

  const received = receivedAgg._sum.amount ?? 0;
  const outstanding = outstandingAgg._sum.amount ?? 0;
  const paidTodayTotal = paidTodayInstallments.reduce((sum, i) => sum + i.amount, 0);

  // ---- Pending loan rows: enrich with same-PAN duplicate count ------------
  // Count ACTIVE loans (REQUESTED + APPROVED) per PAN. A PAN with >1 active
  // loan means another account on the same PAN already has a pending or
  // disbursed loan — strong signal of identity reuse the admin should review
  // before approving. The row itself contributes 1 to its PAN's count, so
  // `duplicates = totalOnPan - 1` gives the number of OTHER active loans.
  const pendingPans = pendingLoans
    .map((l) => l.user.panNumber)
    .filter((p): p is string => !!p);
  const panCounts = new Map<string, number>();
  if (pendingPans.length > 0) {
    const panAgg = await prisma.user.findMany({
      where: { panNumber: { in: pendingPans } },
      select: {
        panNumber: true,
        loans: {
          where: { status: { in: ["REQUESTED", "APPROVED"] } },
          select: { id: true },
        },
      },
    });
    for (const u of panAgg) {
      if (!u.panNumber) continue;
      panCounts.set(u.panNumber, (panCounts.get(u.panNumber) ?? 0) + u.loans.length);
    }
  }

  const pendingRows: PendingLoanRow[] = pendingLoans.map((l) => {
    const totalOnPan = l.user.panNumber ? panCounts.get(l.user.panNumber) ?? 0 : 0;
    const duplicates = l.user.panNumber ? Math.max(0, totalOnPan - 1) : 0;
    return {
      id: l.id,
      requestedAt: l.requestedAt.toISOString(),
      userName: l.user.name,
      userEmail: l.user.email,
      userCode: l.user.referralCode,
      userPhone: l.user.phone,
      userWhatsapp: l.user.whatsappNumber,
      userPan: l.user.panNumber,
      tierLabel: tierByKey(l.tierKey)?.label ?? l.tierKey,
      amount: l.amount,
      totalWeeks: l.totalWeeks,
      leftLegCount: l.user.leftLegCount,
      rightLegCount: l.user.rightLegCount,
      duplicatePanCount: duplicates,
    };
  });

  // ---- Unpaid installments: compute per-user total unpaid -----------------
  const unpaidUserIds = Array.from(
    new Set(
      [...dueTodayInstallments, ...overdueInstallments].map((i) => i.loan.user.id),
    ),
  );
  const totalsByUser = new Map<string, number>();
  if (unpaidUserIds.length > 0) {
    const agg = await prisma.loanInstallment.groupBy({
      by: ["loanId"],
      where: {
        loan: { status: "APPROVED", userId: { in: unpaidUserIds } },
        status: { in: ["PENDING", "RECEIPT_UPLOADED"] },
      },
      _sum: { amount: true },
    });
    const loanToUser = new Map<string, string>();
    [...dueTodayInstallments, ...overdueInstallments].forEach((i) => {
      loanToUser.set(i.loanId, i.loan.user.id);
    });
    for (const r of agg) {
      const uid = loanToUser.get(r.loanId);
      if (!uid) continue;
      totalsByUser.set(uid, (totalsByUser.get(uid) ?? 0) + (r._sum.amount ?? 0));
    }
  }

  function toUnpaidRow(i: (typeof dueTodayInstallments)[number]): UnpaidInstallmentRow {
    const daysOverdue = daysOverdueIst(i.dueDate);
    return {
      id: i.id,
      loanId: i.loanId,
      weekNumber: i.weekNumber,
      amount: i.amount,
      loanAmount: i.loan.amount,
      dueDate: i.dueDate.toISOString(),
      status: i.status as "PENDING" | "RECEIPT_UPLOADED",
      lastReminderAt: i.lastReminderAt?.toISOString() ?? null,
      daysOverdue,
      userName: i.loan.user.name,
      userEmail: i.loan.user.email,
      userCode: i.loan.user.referralCode,
      userPhone: i.loan.user.phone,
      userWhatsapp: i.loan.user.whatsappNumber,
      userPan: i.loan.user.panNumber,
      tierLabel: tierByKey(i.loan.tierKey)?.label ?? i.loan.tierKey,
      totalUnpaid: totalsByUser.get(i.loan.user.id) ?? 0,
    };
  }

  const dueTodayRows = dueTodayInstallments.map(toUnpaidRow);
  const overdueRows = overdueInstallments.map(toUnpaidRow);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loan Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review loan requests, disburse funds offline, and verify weekly receipts.
        </p>
      </div>

      {/* Requests that no longer qualify under the completely-filled-tree rule */}
      <EligibilityAuditCard />

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi icon={<Clock className="h-5 w-5" />} label="Pending loan requests" value={pendingLoans.length} tone="amber" />
        <Kpi icon={<CalendarDays className="h-5 w-5" />} label="Due today" value={dueTodayRows.length} tone="sky" />
        <Kpi icon={<AlertTriangle className="h-5 w-5" />} label="Overdue installments" value={overdueRows.length} tone="red" />
        <Kpi icon={<Receipt className="h-5 w-5" />} label="Paid today" value={`${paidTodayInstallments.length} · ${formatRupees(paidTodayTotal)}`} tone="brand" />
        <Kpi icon={<BadgeIndianRupee className="h-5 w-5" />} label="Total disbursed" value={formatRupees(totalDisbursed._sum.amount ?? 0)} tone="emerald" />
      </div>

      {/* Repayment tracking — received vs. still owed */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5 ring-1 ring-emerald-200 bg-emerald-50/40">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold">Loan amount received</span>
          </div>
          <div className="mt-3 text-3xl font-bold tabular-nums text-emerald-700">{formatRupees(received)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {receivedAgg._count} verified installment{receivedAgg._count === 1 ? "" : "s"} collected so far.
          </div>
        </div>
        <div className="card p-5 ring-1 ring-amber-200 bg-amber-50/40">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-semibold">Loan amount not received</span>
          </div>
          <div className="mt-3 text-3xl font-bold tabular-nums text-amber-700">{formatRupees(outstanding)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {outstandingAgg._count} installment{outstandingAgg._count === 1 ? "" : "s"} still due on active loans.
          </div>
        </div>
      </div>

      {/* Pending loan requests — with PAN-aware search */}
      <PendingLoansSection rows={pendingRows} />

      {/* Installments due today (IST) */}
      <UnpaidInstallmentsSection
        title="Installments due today"
        description="Borrowers whose repayment falls on today's date. Send a same-day reminder so they don't slip into overdue."
        rows={dueTodayRows}
        tone="amber"
      />

      {/* Overdue installments */}
      <UnpaidInstallmentsSection
        title="Overdue (unpaid) installments"
        description="Repayments past their due date with no receipt yet. Send a WhatsApp reminder to the borrower — the timestamp is logged here."
        rows={overdueRows}
        tone="red"
      />

      {/* Paid today — installments verified within today's IST day */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-brand-700" /> Paid today ({paidTodayInstallments.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Loan installments you verified today. Receipts remain viewable for audit.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Collected today</div>
            <div className="text-lg font-bold tabular-nums text-emerald-700">{formatRupees(paidTodayTotal)}</div>
          </div>
        </div>
        {paidTodayInstallments.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No installments verified today yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Verified</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Tier</th>
                  <th className="px-4 py-2 font-medium">Week</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                  <th className="px-4 py-2 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {paidTodayInstallments.map((i) => (
                  <PaidTodayRow
                    key={i.id}
                    id={i.id}
                    weekNumber={i.weekNumber}
                    amount={i.amount}
                    verifiedAt={i.verifiedAt!.toISOString()}
                    userName={i.loan.user.name}
                    userCode={i.loan.user.referralCode}
                    userPhone={i.loan.user.phone}
                    tierLabel={tierByKey(i.loan.tierKey)?.label ?? i.loan.tierKey}
                    hasReceipt={!!i.receiptMime}
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
      <RecentLoansSection
        rows={recentLoans.map((l) => ({
          id: l.id,
          updatedAt: l.updatedAt.toISOString(),
          userName: l.user.name,
          userEmail: l.user.email,
          userCode: l.user.referralCode,
          tierLabel: tierByKey(l.tierKey)?.label ?? l.tierKey,
          amount: l.amount,
          totalWeeks: l.totalWeeks,
          status: l.status as "APPROVED" | "CLOSED" | "REJECTED",
        }))}
      />
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
  tone: "amber" | "emerald" | "brand" | "sky" | "red";
}) {
  const toneMap = {
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    brand: "bg-brand-100 text-brand-700",
    sky: "bg-sky-100 text-sky-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <div className="card p-5">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${toneMap[tone]}`}>{icon}</div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
