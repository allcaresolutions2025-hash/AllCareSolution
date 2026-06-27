"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Gift, CheckCircle2, Clock, Truck, Package, XCircle } from "lucide-react";
import type { RewardClaimStatus } from "@prisma/client";

const STATUS: Record<RewardClaimStatus, { label: string; chip: string; icon: React.ReactNode }> = {
  PENDING:    { label: "Claim submitted", chip: "bg-amber-50 text-amber-700 border-amber-200",       icon: <Clock className="h-3.5 w-3.5" /> },
  APPROVED:   { label: "Approved",        chip: "bg-promax-50 text-promax-700 border-promax-200",    icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  DISPATCHED: { label: "On the way",      chip: "bg-sky-50 text-sky-700 border-sky-200",             icon: <Truck className="h-3.5 w-3.5" /> },
  DELIVERED:  { label: "Delivered",       chip: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Package className="h-3.5 w-3.5" /> },
  REJECTED:   { label: "Rejected",        chip: "bg-red-50 text-red-700 border-red-200",             icon: <XCircle className="h-3.5 w-3.5" /> },
};

export function WelcomeKitCard({ claim }: { claim: { status: RewardClaimStatus } | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function claimNow() {
    setLoading(true);
    const res = await fetch("/api/promax/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: 0 }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(json.error || "Could not claim"); return; }
    toast.success("Welcome Kit claimed — awaiting admin approval");
    router.refresh();
  }

  return (
    <div className="card p-6 bg-promax-soft border-promax-200">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="h-14 w-14 rounded-xl grid place-items-center bg-promax-600 text-white text-2xl">🎁</div>
        <div className="flex-1 min-w-[220px]">
          <div className="font-bold text-lg">Welcome Kit</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            Your one-time joining gift — claim it any time, no team requirement.
          </div>
          {claim && (
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS[claim.status].chip}`}>
                {STATUS[claim.status].icon} {STATUS[claim.status].label}
              </span>
            </div>
          )}
        </div>
        <div className="self-center">
          {!claim && (
            <button
              onClick={claimNow}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-promax-700 hover:bg-promax-800 text-white text-sm font-semibold disabled:opacity-60"
            >
              <Gift className="h-4 w-4" /> {loading ? "Claiming…" : "Claim Welcome Kit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
