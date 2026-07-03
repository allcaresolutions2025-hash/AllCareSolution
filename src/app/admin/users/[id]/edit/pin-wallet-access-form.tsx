"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Lock, Unlock, KeyRound } from "lucide-react";

export function PinWalletAccessForm({
  userId,
  initialUnlocked,
  leftLegCount,
  rightLegCount,
}: {
  userId: string;
  initialUnlocked: boolean;
  leftLegCount: number;
  rightLegCount: number;
}) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [loading, setLoading] = useState(false);

  // Whether the member already qualifies by the normal rule (both legs > 1).
  const qualifiesByLegs = leftLegCount > 1 && rightLegCount > 1;

  async function setAccess(next: boolean) {
    setLoading(true);
    const res = await fetch("/api/admin/pin-wallet/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, unlocked: next }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not update Pin Wallet access");
      return;
    }
    setUnlocked(next);
    toast.success(next ? "Pin Wallet unlocked for this member" : "Pin Wallet override removed");
    router.refresh();
  }

  const canTransact = unlocked || qualifiesByLegs;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 text-brand-700">
        <KeyRound className="h-4 w-4" />
        <h2 className="font-semibold">Pin Wallet access</h2>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          By default a member can use the Pin Wallet only when both legs have more than one member
          (Left {leftLegCount} · Right {rightLegCount}
          {qualifiesByLegs ? " — qualifies" : " — does not qualify yet"}).
        </p>
        <p>Turn this on to let the member buy pins and transfer points regardless of their legs.</p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          {canTransact ? (
            <Unlock className="h-4 w-4 text-emerald-600" />
          ) : (
            <Lock className="h-4 w-4 text-amber-600" />
          )}
          <div>
            <div className="text-sm font-medium">
              {canTransact ? "Pin Wallet is enabled" : "Pin Wallet is locked"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {unlocked
                ? "Enabled by admin override"
                : qualifiesByLegs
                ? "Enabled by leg requirement"
                : "Not enabled"}
            </div>
          </div>
        </div>

        {unlocked ? (
          <button
            onClick={() => setAccess(false)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
          >
            <Lock className="h-3.5 w-3.5" /> Remove override
          </button>
        ) : (
          <button
            onClick={() => setAccess(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Unlock className="h-3.5 w-3.5" /> Enable Pin Wallet
          </button>
        )}
      </div>
    </div>
  );
}
