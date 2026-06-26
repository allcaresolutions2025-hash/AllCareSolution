"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { KeyRound } from "lucide-react";

// Pro Max members issue their own Pro Max pins instantly (no admin approval),
// then apply them to downlines.
export function GetProMaxPinsForm() {
  const router = useRouter();
  const [qty, setQty] = useState("1");
  const [loading, setLoading] = useState(false);
  const quantity = parseInt(qty, 10) || 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity < 1) return toast.error("Quantity must be at least 1");
    setLoading(true);
    const res = await fetch("/api/affiliate/pin-pro-max/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not issue pins");
      return;
    }
    toast.success(`Issued ${data.pinsIssued} Pro Max pin${data.pinsIssued === 1 ? "" : "s"}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4 border-2 border-amber-200">
      <div className="flex items-center gap-2 text-amber-700">
        <KeyRound className="h-4 w-4" /> <h2 className="font-semibold">Get Pro Max pins</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        As a Pro Max member you issue Pro Max pins instantly — no admin approval. Apply each pin to a
        downline below to make them Pro Max.
      </p>
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-[160px]">
          <label className="label">Quantity</label>
          <input
            type="text"
            inputMode="numeric"
            className="input tabular-nums"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={() =>
              setQty((q) => {
                const n = parseInt(q, 10);
                if (!(n >= 1)) return "1";
                return String(Math.min(100, n));
              })
            }
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Issuing…" : "Issue pins"}
        </button>
      </div>
    </form>
  );
}
