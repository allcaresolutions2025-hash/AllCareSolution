"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Gift, CheckCircle2, Clock, Truck, Package, XCircle, ChevronRight } from "lucide-react";
import type { RewardLevel } from "@/lib/rewards";
import type { RewardClaimStatus } from "@prisma/client";

type ClaimInfo = {
  status: RewardClaimStatus;
  adminNote: string | null;
  requestedAt: Date;
  updatedAt: Date;
} | null;

interface Props {
  reward: RewardLevel;
  isUnlocked: boolean;
  minLeg: number;
  claim: ClaimInfo;
}

const STATUS_CONFIG: Record<RewardClaimStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:    { label: "Claim Submitted",  color: "amber",   icon: <Clock className="h-3.5 w-3.5" /> },
  APPROVED:   { label: "Approved",         color: "brand",   icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  DISPATCHED: { label: "On the Way",       color: "sky",     icon: <Truck className="h-3.5 w-3.5" /> },
  DELIVERED:  { label: "Delivered",        color: "emerald", icon: <Package className="h-3.5 w-3.5" /> },
  REJECTED:   { label: "Rejected",         color: "red",     icon: <XCircle className="h-3.5 w-3.5" /> },
};

const COLOR_CHIP: Record<string, string> = {
  amber:   "bg-amber-50 text-amber-700 border-amber-200",
  brand:   "bg-brand-50 text-brand-700 border-brand-200",
  sky:     "bg-sky-50 text-sky-700 border-sky-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red:     "bg-red-50 text-red-700 border-red-200",
};

export function RewardCard({ reward, isUnlocked, minLeg, claim }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const progressPct = Math.min(100, Math.round((minLeg / reward.minLegSize) * 100));

  async function handleClaim() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/affiliate/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: reward.level }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to submit claim"); return; }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const statusCfg = claim ? STATUS_CONFIG[claim.status] : null;

  return (
    <div className={`card p-5 flex flex-col gap-3 transition-all ${isUnlocked ? "border-brand-200 shadow-sm" : "opacity-70"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{reward.icon}</span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Level {reward.level}</div>
            <div className="font-semibold text-sm leading-tight">{reward.gift}</div>
          </div>
        </div>
        {isUnlocked ? (
          <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center shrink-0">
            <Gift className="h-4 w-4" />
          </div>
        ) : (
          <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-400 grid place-items-center shrink-0">
            <Lock className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Requirement */}
      <div className="text-xs text-muted-foreground">
        Need <strong>{reward.minLegSize.toLocaleString("en-IN")}</strong> on each side
        {" "}({reward.totalMembers.toLocaleString("en-IN")} total)
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Your weaker leg: {minLeg.toLocaleString("en-IN")}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isUnlocked ? "bg-emerald-500" : "bg-brand-400"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Status / Action */}
      <div className="mt-auto pt-1">
        {claim ? (
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${COLOR_CHIP[statusCfg!.color]}`}>
              {statusCfg!.icon} {statusCfg!.label}
            </div>
            {claim.status === "REJECTED" && claim.adminNote && (
              <p className="text-xs text-red-600">{claim.adminNote}</p>
            )}
            {claim.status === "DISPATCHED" && (
              <p className="text-xs text-sky-700 flex items-center gap-1">
                <Truck className="h-3 w-3" /> Your gift is on its way!
              </p>
            )}
            {claim.status === "DELIVERED" && (
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Gift delivered. Enjoy!
              </p>
            )}
          </div>
        ) : isUnlocked ? (
          <div>
            {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
            <button
              onClick={handleClaim}
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-1.5 text-sm"
            >
              {loading ? "Submitting…" : (<><Gift className="h-4 w-4" /> Request Gift <ChevronRight className="h-3.5 w-3.5" /></>)}
            </button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" /> Locked — grow your weaker leg to unlock
          </div>
        )}
      </div>
    </div>
  );
}
