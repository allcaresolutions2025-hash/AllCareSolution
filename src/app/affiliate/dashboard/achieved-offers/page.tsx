import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Award, Info, CheckCircle2, CircleDashed, BadgeIndianRupee, Lock } from "lucide-react";
import { LOAN_TIERS, tierIsEligible, tierIsCompleted, highestEligibleTier, formatRupees, type EligibilityContext } from "@/lib/loan";
import { ApplyLoanButton } from "./apply-loan-button";

export const dynamic = "force-dynamic";

export default async function AchievedOffersPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [me, directLeftSlots, directRightSlots, activeLoan, closedLoans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leftLegCount: true, rightLegCount: true },
    }),
    prisma.user.count({ where: { referrerId: session.user.id, slot: "LEFT" } }),
    prisma.user.count({ where: { referrerId: session.user.id, slot: "RIGHT" } }),
    prisma.loan.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["REQUESTED", "APPROVED"] },
      },
      orderBy: { requestedAt: "desc" },
      select: { id: true, status: true, amount: true, tierKey: true },
    }),
    prisma.loan.findMany({
      where: { userId: session.user.id, status: "CLOSED" },
      select: { tierKey: true },
    }),
  ]);

  const ctx: EligibilityContext = {
    leftLegCount: me?.leftLegCount ?? 0,
    rightLegCount: me?.rightLegCount ?? 0,
    directLeftSlots,
    directRightSlots,
    completedTierKeys: closedLoans.map((l) => l.tierKey),
  };

  const topTier = highestEligibleTier(ctx);

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-brand-700 text-white p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl lg:text-3xl font-bold">Your Offer Achievements</h1>
          <p className="mt-1 text-sm lg:text-base text-emerald-50">
            Track your binary-tree progress and unlock loans as you grow.
          </p>
        </div>
        <Award className="absolute right-6 lg:right-10 top-1/2 -translate-y-1/2 h-20 w-20 lg:h-28 lg:w-28 text-white/15" />
      </div>

      {/* Active loan banner / Apply button */}
      <div className="card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
            <BadgeIndianRupee className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Loan Eligibility</div>
            <div className="text-sm text-muted-foreground">
              Left leg: <span className="font-mono tabular-nums">{ctx.leftLegCount}</span> ·
              {" "}Right leg: <span className="font-mono tabular-nums">{ctx.rightLegCount}</span> ·
              {" "}Direct L/R slots: <span className="font-mono">{ctx.directLeftSlots}/{ctx.directRightSlots}</span>
            </div>
            {topTier ? (
              <div className="mt-1 text-sm">
                You qualify for <span className="font-semibold text-emerald-700">{formatRupees(topTier.amount)}</span> — repay over {topTier.totalWeeks} weeks.
              </div>
            ) : (
              <div className="mt-1 text-sm text-muted-foreground">
                Match a tier below exactly to unlock a loan offer.
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {activeLoan ? (
            <Link
              href="/affiliate/dashboard/loan"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              View my loan
            </Link>
          ) : topTier ? (
            <ApplyLoanButton tierKey={topTier.key} amountLabel={formatRupees(topTier.amount)} />
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-200 text-slate-500 text-sm font-medium cursor-not-allowed"
              title="Match a tier first"
            >
              Apply for loan
            </button>
          )}
        </div>
      </div>

      {/* Eligibility ladder */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Loan Tiers</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Each tier requires an EXACT pair match (the same number of members on Left and Right legs).
            The first tier just needs one direct referral on each side.
          </p>
        </div>
        <div className="divide-y">
          {LOAN_TIERS.map((tier) => {
            const completed = tierIsCompleted(tier, ctx);
            const eligible = tierIsEligible(tier, ctx);
            const state: "completed" | "eligible" | "locked" = completed
              ? "completed"
              : eligible
                ? "eligible"
                : "locked";
            return (
              <div key={tier.key} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  {state === "completed" ? (
                    <Lock className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                  ) : state === "eligible" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <CircleDashed className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{tier.amountLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {tier.label} · Repay over {tier.totalWeeks} weeks
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    state === "completed"
                      ? "bg-slate-100 text-slate-700 border-slate-300"
                      : state === "eligible"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {state === "completed" ? "Completed" : state === "eligible" ? "Eligible" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t bg-slate-50 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
          <ul className="space-y-1 leading-relaxed">
            <li>Loan amount is disbursed offline after admin verification.</li>
            <li>Repayment is split equally across the weeks shown for each tier.</li>
            <li>Upload a payment receipt each week — your loan is cleared once all receipts are verified.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
