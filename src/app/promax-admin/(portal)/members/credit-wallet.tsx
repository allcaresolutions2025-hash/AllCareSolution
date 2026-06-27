"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";

// Inline credit control for a single member: add Pin Wallet points or Pro Max
// earning points.
export function CreditWallet({ userId, memberName }: { userId: string; memberName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<"PIN_WALLET" | "POINTS">("PIN_WALLET");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(points);
    if (!(n > 0)) return toast.error("Enter a positive amount");
    setBusy(true);
    const res = await fetch("/api/promax-admin/wallet/credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, target, points: n, note: note.trim() || undefined }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Credit failed"); return; }
    toast.success(`Credited ${n.toLocaleString("en-IN")} to ${memberName}`);
    setPoints(""); setNote(""); setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-promax-700 hover:bg-promax-800 text-white">
        <Plus className="h-3.5 w-3.5" /> Credit
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 bg-promax-50 border border-promax-200 rounded-lg p-2">
      <div>
        <label className="text-[10px] uppercase text-muted-foreground block">Wallet</label>
        <select className="input h-8 py-0 text-xs" value={target} onChange={(e) => setTarget(e.target.value as "PIN_WALLET" | "POINTS")}>
          <option value="PIN_WALLET">Pin Wallet</option>
          <option value="POINTS">Pro Max points</option>
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase text-muted-foreground block">Points</label>
        <input className="input h-8 py-0 text-xs w-24 tabular-nums" inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value.replace(/[^0-9]/g, ""))} placeholder="1000" />
      </div>
      <div>
        <label className="text-[10px] uppercase text-muted-foreground block">Note</label>
        <input className="input h-8 py-0 text-xs w-32" value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" maxLength={300} />
      </div>
      <button type="submit" disabled={busy} className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-promax-700 hover:bg-promax-800 text-white disabled:opacity-60 h-8">
        {busy ? "…" : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="h-8 w-8 grid place-items-center rounded-md border hover:bg-muted">
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
