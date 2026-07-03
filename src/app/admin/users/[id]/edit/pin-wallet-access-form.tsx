"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Lock, Unlock, KeyRound, Ban } from "lucide-react";

export function PinWalletAccessForm({
  userId,
  initialUnlocked,
  initialLocked,
  leftLegCount,
  rightLegCount,
}: {
  userId: string;
  initialUnlocked: boolean;
  initialLocked: boolean;
  leftLegCount: number;
  rightLegCount: number;
}) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [locked, setLocked] = useState(initialLocked);
  const [loading, setLoading] = useState(false);

  // Whether the member already qualifies by the normal rule (both legs > 1).
  const qualifiesByLegs = leftLegCount > 1 && rightLegCount > 1;
  // Effective access — the admin lock overrides everything.
  const enabled = !locked && (unlocked || qualifiesByLegs);

  async function run(action: "enable" | "disable") {
    setLoading(true);
    const res = await fetch("/api/admin/pin-wallet/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not update Pin Wallet access");
      return;
    }
    // Mirror the server-side flag changes locally.
    if (action === "enable") {
      setUnlocked(true);
      setLocked(false);
    } else {
      setLocked(true);
    }
    toast.success(action === "enable" ? "Pin Wallet enabled for this member" : "Pin Wallet disabled for this member");
    router.refresh();
  }

  const reason = locked
    ? "Disabled by admin"
    : unlocked
    ? "Enabled by admin"
    : qualifiesByLegs
    ? "Enabled automatically (leg requirement met)"
    : "Leg requirement not met";

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 text-brand-700">
        <KeyRound className="h-4 w-4" />
        <h2 className="font-semibold">Pin Wallet access</h2>
      </div>

      {/* Effective status */}
      <div className="flex items-center gap-2 rounded-lg border p-3">
        {enabled ? <Unlock className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-amber-600" />}
        <div>
          <div className="text-sm font-medium">{enabled ? "Pin Wallet is enabled" : "Pin Wallet is locked"}</div>
          <div className="text-[11px] text-muted-foreground">
            {reason} · Left {leftLegCount} · Right {rightLegCount}
          </div>
        </div>
      </div>

      {/* Single state-based action: show Disable when enabled, Enable when not */}
      {enabled ? (
        <div className="rounded-lg border border-red-200 bg-red-50/40 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            The member can buy pins and transfer points. Disable to force-lock the wallet — e.g. to
            freeze a member while investigating an issue.
          </p>
          <button
            onClick={() => run("disable")}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Ban className="h-3.5 w-3.5" /> {loading ? "Saving…" : "Disable Pin Wallet"}
          </button>
        </div>
      ) : (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            {locked
              ? "This member's Pin Wallet is disabled. Enable it to let them buy pins and transfer points again."
              : "This member doesn't meet the leg requirement yet. Enable to grant access to the Pin Wallet."}
          </p>
          <button
            onClick={() => run("enable")}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Unlock className="h-3.5 w-3.5" /> {loading ? "Saving…" : "Enable Pin Wallet"}
          </button>
        </div>
      )}
    </div>
  );
}
