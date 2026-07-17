import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Award, Info, CheckCircle2, CircleDashed, BadgeIndianRupee, Lock, Wrench, ShieldAlert, Hourglass } from "lucide-react";
import { LOAN_TIERS, tierIsEligible, tierIsCompleted, nextClaimableTier, formatRupees, loansPaused, LOAN_PAUSE_MESSAGE, countActivePanLoanConflicts, PAN_CONFLICT_MESSAGE, countIdentityLoanConflicts, IDENTITY_CONFLICT_MESSAGE, hasTakenLevel2Loan, level3LockedByHigherLoan, LEVEL3_5000_KEY, type EligibilityContext } from "@/lib/loan";
import { getLegFillDepths } from "@/lib/network";
import { ApplyLoanButton } from "./apply-loan-button";
import { RequestUnlockButton } from "./request-unlock-button";

export const dynamic = "force-dynamic";

export default async function AchievedOffersPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [me, directLeftSlots, directRightSlots, fillDepths, activeLoan, closedLoans, panConflict, identityConflict, latestUnlockReq, level2Taken, takenLoans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { leftLegCount: true, rightLegCount: true, phone: true, whatsappNumber: true },
    }),
    prisma.user.count({ where: { referrerId: session.user.id, slot: "LEFT" } }),
    prisma.user.count({ where: { referrerId: session.user.id, slot: "RIGHT" } }),
    getLegFillDepths(session.user.id),
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
    // These guards already return 0 conflicts once the member is loanUnlocked.
    countActivePanLoanConflicts(prisma, session.user.id),
    countIdentityLoanConflicts(prisma, session.user.id),
    prisma.loanUnlockRequest.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { status: true, adminNote: true },
    }),
    // Rs. 1,000 starter is hidden once the member has taken the Rs. 2,000 loan.
    hasTakenLevel2Loan(prisma, session.user.id),
    // All non-rejected loans — used to lock the Rs. 5,000 Level-3 for members
    // who already took the Rs. 10,000 (Level-4) loan.
    prisma.loan.findMany({
      where: { userId: session.user.id, status: { not: "REJECTED" } },
      select: { tierKey: true },
    }),
  ]);
  // "Blocked" = tripped an identity/PAN-reuse guard and not yet admin-unlocked.
  const identityBlocked = identityConflict.conflictCount > 0;
  const panBlocked = panConflict.conflictCount > 0;
  const loanBlocked = identityBlocked || panBlocked;
  const unlockPending = latestUnlockReq?.status === "PENDING";
  const unlockRejected = latestUnlockReq?.status === "REJECTED";

  const ctx: EligibilityContext = {
    leftLegCount: me?.leftLegCount ?? 0,
    rightLegCount: me?.rightLegCount ?? 0,
    directLeftSlots,
    directRightSlots,
    leftFillDepth: fillDepths.leftFillDepth,
    rightFillDepth: fillDepths.rightFillDepth,
    completedTierKeys: closedLoans.map((l) => l.tierKey),
    hasTakenLevel2Loan: level2Taken,
    takenTierKeys: takenLoans.map((l) => l.tierKey),
  };

  const claimable = nextClaimableTier(ctx);
  const paused = loansPaused();

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

      {paused && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
          <Wrench className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <div className="font-semibold">Loan applications temporarily paused</div>
            <div className="mt-0.5">{LOAN_PAUSE_MESSAGE}</div>
          </div>
        </div>
      )}

      {loanBlocked && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1">
            <ShieldAlert className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <div className="font-semibold">Loans are blocked for your account</div>
              <div className="mt-0.5">{identityBlocked ? IDENTITY_CONFLICT_MESSAGE : PAN_CONFLICT_MESSAGE}</div>
              {unlockRejected && latestUnlockReq?.adminNote && (
                <div className="mt-1 text-xs text-red-700">Admin note: {latestUnlockReq.adminNote}</div>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {unlockPending ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                <Hourglass className="h-3.5 w-3.5" /> Unlock request under review
              </span>
            ) : (
              <RequestUnlockButton />
            )}
          </div>
        </div>
      )}

      {/* Active loan banner / Apply button */}
      <div className="card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
            <BadgeIndianRupee className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Loan Eligibility</div>
            <div className="text-sm text-muted-foreground">
              Filled level — Left: <span className="font-mono tabular-nums">{ctx.leftFillDepth ?? 0}</span> ·
              {" "}Right: <span className="font-mono tabular-nums">{ctx.rightFillDepth ?? 0}</span>
              {" "}<span className="text-xs">(both legs must be completely filled to a level — no empty slots)</span>
            </div>
            {claimable ? (
              <div className="mt-1 text-sm">
                You can apply for <span className="font-semibold text-emerald-700">{formatRupees(claimable.amount)}</span> — repay over {claimable.totalWeeks} week{claimable.totalWeeks === 1 ? "" : "s"}.
              </div>
            ) : (
              <div className="mt-1 text-sm text-muted-foreground">
                Fill <strong>both</strong> Left and Right legs completely — every slot up to a level occupied — to unlock that level&apos;s loan offer.
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
          ) : paused ? (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-200 text-slate-500 text-sm font-medium cursor-not-allowed"
              title={LOAN_PAUSE_MESSAGE}
            >
              <Wrench className="h-4 w-4" />
              Paused for maintenance
            </button>
          ) : loanBlocked ? (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-100 text-red-700 text-sm font-medium cursor-not-allowed"
              title={identityBlocked ? IDENTITY_CONFLICT_MESSAGE : PAN_CONFLICT_MESSAGE}
            >
              <ShieldAlert className="h-4 w-4" />
              Loans blocked
            </button>
          ) : claimable ? (
            <ApplyLoanButton
              tierKey={claimable.key}
              amountLabel={formatRupees(claimable.amount)}
              registeredPhone={me?.phone ?? null}
              savedWhatsappNumber={me?.whatsappNumber ?? null}
            />
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
            You qualify for a tier once your Left and Right legs meet its member requirement. Loans are taken
            in order — clear one before the next unlocks. Level 3 (Rs. 5,000) needs 3 members on each leg;
            members who already took the Rs. 10,000 loan skipped it and can no longer apply for it.
          </p>
        </div>
        <div className="divide-y">
          {LOAN_TIERS.map((tier) => {
            const completed = tierIsCompleted(tier, ctx);
            const thresholdMet = tierIsEligible(tier, ctx);
            const canClaim = claimable?.key === tier.key;
            // The Rs. 5,000 Level-3 is "missed" for members who already took the
            // Rs. 10,000 (Level-4) loan — permanently unavailable to them.
            const missed = tier.key === LEVEL3_5000_KEY && !completed && level3LockedByHigherLoan(ctx);
            const state: "completed" | "canClaim" | "waiting" | "locked" | "missed" = completed
              ? "completed"
              : missed
                ? "missed"
                : canClaim
                  ? "canClaim"
                  : thresholdMet
                    ? "waiting"
                    : "locked";
            const badge = {
              completed: { label: "Completed",   cls: "bg-slate-100 text-slate-700 border-slate-300" },
              canClaim:  { label: "Apply now",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              waiting:   { label: "Eligible — clear previous loan first", cls: "bg-amber-50 text-amber-800 border-amber-200" },
              locked:    { label: "Locked",      cls: "bg-slate-50 text-slate-600 border-slate-200" },
              missed:    { label: "Not available", cls: "bg-slate-50 text-slate-500 border-slate-200" },
            }[state];
            return (
              <div key={tier.key} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  {state === "completed" ? (
                    <Lock className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                  ) : state === "canClaim" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : state === "waiting" ? (
                    <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <CircleDashed className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{tier.amountLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {tier.label} · Repay over {tier.totalWeeks} week{tier.totalWeeks === 1 ? "" : "s"}
                    </div>
                    {state === "waiting" && claimable && (
                      <div className="text-xs text-amber-700 mt-1">
                        Complete the {formatRupees(claimable.amount)} loan first to unlock this tier.
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.cls}`}>
                  {badge.label}
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
