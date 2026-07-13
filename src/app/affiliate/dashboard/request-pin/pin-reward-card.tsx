"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Gift, CheckCircle2, Clock, XCircle } from "lucide-react";

type Claim = {
  id: string;
  pointsValue: number;
  status: string;
  requestedAt: string;
};

export function PinRewardCard({
  rewardPoints,
  eligiblePins,
  claims,
}: {
  rewardPoints: number;
  eligiblePins: number; // # of 2000-pt pins obtained
  claims: Claim[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Rejected claims don't consume the entitlement.
  const activeClaims = claims.filter((c) => c.status !== "REJECTED").length;
  const available = Math.max(0, eligiblePins - activeClaims);

  async function requestReward() {
    if (busy || available <= 0) return;
    setBusy(true);
    const res = await fetch("/api/affiliate/pin-rewards", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Request failed");
      return;
    }
    toast.success("Reward requested — awaiting admin approval");
    router.refresh();
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-5 border-b flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg grid place-items-center bg-violet-100 text-violet-700 shrink-0">
          <Gift className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">2,000 pts pin reward</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Every <strong>2,000 pts pin</strong> you obtain lets you claim a{" "}
            <strong>{rewardPoints.toLocaleString("en-IN")} pts</strong> reward into your payout wallet.
            Request it below; admin approves and credits the points, which you can then withdraw.
          </p>
        </div>
      </div>

      <div className="p-5 flex flex-wrap items-center gap-4">
        <Stat label="2,000-pt pins" value={eligiblePins} />
        <Stat label="Rewards claimed" value={activeClaims} />
        <Stat label="Available to claim" value={available} tone="violet" />
        <button
          onClick={requestReward}
          disabled={busy || available <= 0}
          className="btn-primary ml-auto disabled:opacity-50"
        >
          {busy
            ? "Requesting…"
            : available > 0
              ? `Request reward (${available} available)`
              : "No reward available"}
        </button>
      </div>

      {claims.length > 0 && (
        <div className="overflow-x-auto border-t">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Requested</th>
                <th className="px-4 py-2 font-medium text-right">Reward</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(c.requestedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold">
                    {c.pointsValue.toLocaleString("en-IN")} pts
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "violet" }) {
  return (
    <div>
      <div className={`text-2xl font-bold tabular-nums ${tone === "violet" ? "text-violet-700" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED" || status === "DISPATCHED" || status === "DELIVERED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}
