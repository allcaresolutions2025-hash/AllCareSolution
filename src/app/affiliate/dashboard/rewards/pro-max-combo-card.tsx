"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, CheckCircle2, Clock, Truck, Package, XCircle, ChevronRight, Sparkles } from "lucide-react";
import type { RewardClaimStatus } from "@prisma/client";
import { PROMAX_COMBO_LEVEL } from "@/lib/rewards";

type ClaimInfo = {
  status: RewardClaimStatus;
  adminNote: string | null;
} | null;

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

export function ProMaxComboCard({ claim }: { claim: ClaimInfo }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClaim() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/affiliate/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: PROMAX_COMBO_LEVEL }),
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
    <div className="card p-5 border-2 border-amber-400 bg-gradient-to-br from-amber-50/70 to-white">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 grid place-items-center shrink-0 text-2xl">
            👑
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Pro Max welcome reward
            </div>
            <div className="font-bold text-base leading-tight mt-0.5">Acht Mart Combo</div>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              As a Pin Pro Max member you&apos;re eligible for the Acht Mart Combo. Apply once — no leg-count requirement.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {claim ? (
            <div className="space-y-2 text-right">
              <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${COLOR_CHIP[statusCfg!.color]}`}>
                {statusCfg!.icon} {statusCfg!.label}
              </div>
              {claim.status === "REJECTED" && claim.adminNote && (
                <p className="text-xs text-red-600">{claim.adminNote}</p>
              )}
              {claim.status === "DISPATCHED" && (
                <p className="text-xs text-sky-700 flex items-center gap-1 justify-end">
                  <Truck className="h-3 w-3" /> On the way!
                </p>
              )}
              {claim.status === "DELIVERED" && (
                <p className="text-xs text-emerald-700 flex items-center gap-1 justify-end">
                  <CheckCircle2 className="h-3 w-3" /> Delivered
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                onClick={handleClaim}
                disabled={loading}
                className="btn-primary inline-flex items-center justify-center gap-1.5 text-sm"
              >
                {loading ? "Submitting…" : (<><Crown className="h-4 w-4" /> Apply for Acht Mart Combo <ChevronRight className="h-3.5 w-3.5" /></>)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
