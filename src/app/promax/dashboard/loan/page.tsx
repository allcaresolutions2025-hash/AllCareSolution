import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupees, tierIsEligible } from "@/lib/loan";
import { PROMAX_LOAN_TIERS, proMaxNextClaimableTier, proMaxTierByKey } from "@/lib/loan-promax";
import { getProMaxLegFillDepths } from "@/lib/network-promax";
import { getProMaxUnlockedLevel } from "@/lib/rewards-promax";
import { ProMaxApplyLoanButton } from "./apply-loan-button";
import { InstallmentRow } from "@/app/affiliate/dashboard/loan/installment-row";
import { BadgeIndianRupee, Clock, CheckCircle2, XCircle, Hourglass, Lock } from "lucide-react";
import type { LoanStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Loan" };

export default async function ProMaxLoanPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [me, directLeftSlots, directRightSlots, fillDepths, loans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { proMaxLeftLegCount: true, proMaxRightLegCount: true, phone: true, whatsappNumber: true },
    }),
    prisma.user.count({ where: { proMaxReferrerId: session.user.id, proMaxSlot: "LEFT" } }),
    prisma.user.count({ where: { proMaxReferrerId: session.user.id, proMaxSlot: "RIGHT" } }),
    getProMaxLegFillDepths(session.user.id),
    prisma.loan.findMany({
      where: { userId: session.user.id, proMax: true },
      orderBy: { requestedAt: "desc" },
      include: { installments: { orderBy: { weekNumber: "asc" } } },
    }),
  ]);
  if (!me) return null;

  const completedTierKeys = loans.filter((l) => l.status === "CLOSED").map((l) => l.tierKey);
  const hasOpenLoan = loans.some((l) => l.status === "REQUESTED" || l.status === "APPROVED");
  const ctx = {
    leftLegCount: me.proMaxLeftLegCount,
    rightLegCount: me.proMaxRightLegCount,
    directLeftSlots,
    directRightSlots,
    leftFillDepth: fillDepths.leftFillDepth,
    rightFillDepth: fillDepths.rightFillDepth,
    completedTierKeys,
  };
  const next = proMaxNextClaimableTier(ctx);
  const unlocked = getProMaxUnlockedLevel(fillDepths.leftFillDepth, fillDepths.rightFillDepth);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BadgeIndianRupee className="h-6 w-6 text-promax-600" /> My Loan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unlock loan levels by filling both Pro Max legs. Apply for the next level; admin approves and credits
          your Pin Wallet. Repay weekly per the schedule.
        </p>
      </div>

      {/* Eligibility / apply */}
      <div className="card p-5 bg-promax-soft border-promax-200">
        {hasOpenLoan ? (
          <div className="flex items-center gap-3 text-sm">
            <Hourglass className="h-5 w-5 text-promax-700" />
            You have an open loan — clear it before applying for the next level.
          </div>
        ) : next ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs text-muted-foreground">You qualify for</div>
              <div className="text-lg font-bold">{next.amountLabel}</div>
              <div className="text-xs text-muted-foreground">{next.label} · {next.totalWeeks} weekly installments</div>
            </div>
            <ProMaxApplyLoanButton
              tierKey={next.key}
              amountLabel={next.amountLabel}
              registeredPhone={me.phone}
              savedWhatsappNumber={me.whatsappNumber}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Lock className="h-5 w-5" /> No loan level unlocked yet. Fill both legs deeper to unlock Level 1.
          </div>
        )}
      </div>

      {/* Ladder reference */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b"><h2 className="font-semibold">Loan ladder</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Level</th>
                <th className="px-4 py-2 font-medium">Requirement (each leg)</th>
                <th className="px-4 py-2 font-medium text-right">Loan</th>
                <th className="px-4 py-2 font-medium text-right">Weeks</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {PROMAX_LOAN_TIERS.map((t) => {
                const eligible = tierIsEligible(t, ctx);
                const done = completedTierKeys.includes(t.key);
                return (
                  <tr key={t.key} className="border-t">
                    <td className="px-4 py-2 font-semibold">L{t.level}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{t.kind === "directs" ? "1 + 1 directs" : `${t.legCount?.toLocaleString("en-IN")} + ${t.legCount?.toLocaleString("en-IN")}`}</td>
                    <td className="px-4 py-2 text-right font-medium">{t.amountLabel}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{t.totalWeeks}</td>
                    <td className="px-4 py-2">
                      {done ? <span className="text-xs text-emerald-700">Completed</span>
                        : eligible ? <span className="text-xs text-promax-700 font-semibold">Unlocked</span>
                        : <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Locked</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-[11px] text-muted-foreground bg-muted/20">Both legs filled to level {unlocked} / 15.</div>
      </div>

      {/* Existing loans */}
      {loans.map((loan) => {
        const tier = proMaxTierByKey(loan.tierKey);
        return (
          <div key={loan.id} className="card overflow-hidden">
            <div className="p-5 border-b flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{formatRupees(loan.amount)}</span>
                  <StatusBadge status={loan.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {tier?.label ?? loan.tierKey} · {loan.totalWeeks} weeks · Applied {loan.requestedAt.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}
                </div>
                {loan.reviewerNotes && (
                  <div className="text-xs mt-2 px-3 py-1.5 rounded bg-amber-50 text-amber-800 border border-amber-200 inline-block">Admin: {loan.reviewerNotes}</div>
                )}
              </div>
            </div>

            {loan.status === "REQUESTED" && (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Hourglass className="h-8 w-8 text-amber-500" /> Waiting for admin to verify and disburse this loan.
              </div>
            )}
            {loan.status === "REJECTED" && (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <XCircle className="h-8 w-8 text-red-500" /> This loan request was rejected.
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

function StatusBadge({ status }: { status: LoanStatus }) {
  const map: Record<LoanStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    REQUESTED: { label: "Pending Approval", cls: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="h-3 w-3" /> },
    APPROVED:  { label: "Active",           cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <BadgeIndianRupee className="h-3 w-3" /> },
    REJECTED:  { label: "Rejected",         cls: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
    CLOSED:    { label: "Cleared",          cls: "bg-sky-100 text-sky-800 border-sky-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  };
  const m = map[status];
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${m.cls}`}>{m.icon} {m.label}</span>;
}
