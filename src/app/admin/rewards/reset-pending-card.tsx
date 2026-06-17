"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, RefreshCw } from "lucide-react";

export function ResetPendingRewardsCard() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rewards/reset-pending");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setPendingCount(json.pendingCount as number);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resetAll() {
    if (!pendingCount) return;
    if (
      !window.confirm(
        `Remove ${pendingCount} pending reward claim${pendingCount === 1 ? "" : "s"} (levels 1–15)? Members will be able to request again under the updated rule. Welcome Kit claims and already approved/dispatched/delivered gifts are NOT affected. This cannot be undone.`,
      )
    ) {
      return;
    }
    setRemoving(true);
    try {
      const res = await fetch("/api/admin/rewards/reset-pending", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove");
      toast.success(`Removed ${json.removed} pending reward claim${json.removed === 1 ? "" : "s"}.`);
      await load();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setRemoving(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-4 text-sm text-muted-foreground flex items-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" /> Checking pending reward claims…
      </div>
    );
  }
  if (!pendingCount) return null;

  return (
    <div className="card p-4 ring-1 ring-amber-200 bg-amber-50/60 flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
          <Trash2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Reset pending reward claims ({pendingCount})</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-prose">
            Removes pending level 1–15 claims so members re-request under the updated
            &ldquo;completely filled tree&rdquo; rule. Welcome Kit claims and gifts already
            approved/dispatched/delivered are kept.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={resetAll}
        disabled={removing}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {removing ? "Removing…" : `Remove ${pendingCount} pending`}
      </button>
    </div>
  );
}
