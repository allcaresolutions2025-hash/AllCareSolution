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
  const [loading, setLoading] = useState<null | "unlocked" | "locked">(null);

  // Whether the member already qualifies by the normal rule (both legs > 1).
  const qualifiesByLegs = leftLegCount > 1 && rightLegCount > 1;
  // Effective access: the admin lock overrides everything.
  const canTransact = !locked && (unlocked || qualifiesByLegs);

  async function setFlag(field: "unlocked" | "locked", value: boolean) {
    setLoading(field);
    const res = await fetch("/api/admin/pin-wallet/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, field, value }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      toast.error(data.error || "Could not update Pin Wallet access");
      return;
    }
    if (field === "unlocked") setUnlocked(value);
    else setLocked(value);
    toast.success(
      field === "locked"
        ? value
          ? "Pin Wallet disabled for this member"
          : "Pin Wallet re-enabled"
        : value
        ? "Pin Wallet unlocked for this member"
        : "Access override removed",
    );
    router.refresh();
  }

  const statusText = locked
    ? "Disabled by admin"
    : unlocked
    ? "Enabled by admin override"
    : qualifiesByLegs
    ? "Enabled by leg requirement"
    : "Locked — leg requirement not met";

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 text-brand-700">
        <KeyRound className="h-4 w-4" />
        <h2 className="font-semibold">Pin Wallet access</h2>
      </div>

      {/* Effective status */}
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
              {statusText} · Left {leftLegCount} · Right {rightLegCount}
            </div>
          </div>
        </div>
      </div>

      {/* Admin kill-switch: disable / re-enable the wallet regardless of legs */}
      <div className="rounded-lg border border-red-200 bg-red-50/40 p-3 space-y-2">
        <div className="text-sm font-medium text-red-800 flex items-center gap-1.5">
          <Ban className="h-4 w-4" /> Disable Pin Wallet
        </div>
        <p className="text-[11px] text-muted-foreground">
          Force-locks the wallet so the member can&apos;t buy pins or transfer points, even if their
          legs are filled. Use this to freeze a member while investigating an issue.
        </p>
        {locked ? (
          <button
            onClick={() => setFlag("locked", false)}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Unlock className="h-3.5 w-3.5" /> {loading === "locked" ? "Saving…" : "Re-enable Pin Wallet"}
          </button>
        ) : (
          <button
            onClick={() => setFlag("locked", true)}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Ban className="h-3.5 w-3.5" /> {loading === "locked" ? "Saving…" : "Disable Pin Wallet"}
          </button>
        )}
      </div>

      {/* Manual unlock override — only relevant when not force-locked */}
      {!locked && (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="text-sm font-medium">Manual unlock (override leg requirement)</div>
          <p className="text-[11px] text-muted-foreground">
            {qualifiesByLegs
              ? "This member already qualifies by their legs — an override isn't needed."
              : "Grant access even though this member doesn't have more than one on both legs."}
          </p>
          {unlocked ? (
            <button
              onClick={() => setFlag("unlocked", false)}
              disabled={loading !== null}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" /> {loading === "unlocked" ? "Saving…" : "Remove override"}
            </button>
          ) : (
            <button
              onClick={() => setFlag("unlocked", true)}
              disabled={loading !== null}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Unlock className="h-3.5 w-3.5" /> {loading === "unlocked" ? "Saving…" : "Enable Pin Wallet"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
