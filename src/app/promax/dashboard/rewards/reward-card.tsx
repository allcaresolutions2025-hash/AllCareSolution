"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Gift, CheckCircle2, Clock, Truck, Package, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { type ProMaxRewardLevel, proMaxRewardMembersPerSide } from "@/lib/rewards-promax";
import type { RewardClaimStatus } from "@prisma/client";

type ClaimInfo = { status: RewardClaimStatus; adminNote: string | null } | null;

const STATUS: Record<RewardClaimStatus, { label: string; chip: string; icon: React.ReactNode }> = {
  PENDING:    { label: "Claim submitted", chip: "bg-amber-50 text-amber-700 border-amber-200",     icon: <Clock className="h-3.5 w-3.5" /> },
  APPROVED:   { label: "Approved",        chip: "bg-promax-50 text-promax-700 border-promax-200",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  DISPATCHED: { label: "On the way",      chip: "bg-sky-50 text-sky-700 border-sky-200",           icon: <Truck className="h-3.5 w-3.5" /> },
  DELIVERED:  { label: "Delivered",       chip: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Package className="h-3.5 w-3.5" /> },
  REJECTED:   { label: "Rejected",        chip: "bg-red-50 text-red-700 border-red-200",           icon: <XCircle className="h-3.5 w-3.5" /> },
};

export function ProMaxRewardCard({
  reward,
  thresholdMet,
  filledLevel,
  claim,
}: {
  reward: ProMaxRewardLevel;
  thresholdMet: boolean;
  filledLevel: number;
  claim: ClaimInfo;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const membersPerSide = proMaxRewardMembersPerSide(reward.level);
  const progressPct = Math.min(100, Math.round((filledLevel / reward.level) * 100));

  async function claimNow() {
    setLoading(true);
    const res = await fetch("/api/promax/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: reward.level }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(json.error || "Could not claim"); return; }
    toast.success("Reward claimed — awaiting admin approval");
    router.refresh();
  }

  return (
    <div className={`card p-5 ${thresholdMet && !claim ? "border-promax-300 ring-1 ring-promax-200" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`h-11 w-11 rounded-xl grid place-items-center text-xl ${thresholdMet ? "bg-promax-100" : "bg-slate-100"}`}>
          {thresholdMet ? reward.icon : <Lock className="h-5 w-5 text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-promax-100 text-promax-800">Level {reward.level}</span>
          </div>
          <div className="font-semibold mt-1">{reward.gift}</div>
          <div className="text-xs text-muted-foreground">Needs {membersPerSide.toLocaleString("en-IN")} members on each leg, fully filled.</div>
        </div>
      </div>

      {!thresholdMet && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-promax-gradient" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Both legs filled to level {filledLevel} / {reward.level}</div>
        </div>
      )}

      <div className="mt-4">
        {claim ? (
          <div>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS[claim.status].chip}`}>
              {STATUS[claim.status].icon} {STATUS[claim.status].label}
            </span>
            {claim.adminNote && <div className="text-xs text-muted-foreground mt-1">{claim.adminNote}</div>}
          </div>
        ) : thresholdMet ? (
          <button
            onClick={claimNow}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-promax-700 hover:bg-promax-800 text-white text-sm font-semibold disabled:opacity-60"
          >
            <Gift className="h-4 w-4" /> {loading ? "Claiming…" : "Claim reward"}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Locked</span>
        )}
      </div>
    </div>
  );
}
