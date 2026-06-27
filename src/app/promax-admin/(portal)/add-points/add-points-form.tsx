"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { WalletCards, Coins } from "lucide-react";

// Dedicated admin tool: add points to a Pro Max member's wallet by Member ID.
export function AddPointsForm() {
  const router = useRouter();
  const [memberCode, setMemberCode] = useState("");
  const [target, setTarget] = useState<"PIN_WALLET" | "POINTS">("PIN_WALLET");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; balance: number } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^AM[0-9]{8}$/.test(memberCode.trim().toUpperCase())) return toast.error("Enter a valid Member ID (AM…)");
    const n = Number(points);
    if (!(n > 0)) return toast.error("Enter a positive amount");
    setBusy(true);
    const res = await fetch("/api/promax-admin/wallet/credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberCode: memberCode.trim().toUpperCase(), target, points: n, note: note.trim() || undefined }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { toast.error(json.error || "Could not add points"); return; }
    toast.success(`Added ${n.toLocaleString("en-IN")} to ${json.memberName}`);
    setDone({ name: json.memberName, balance: json.newBalance });
    setPoints(""); setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-5">
      <div className="flex items-center gap-2 text-promax-700">
        <WalletCards className="h-4 w-4" /> <h2 className="font-semibold">Add points to a member</h2>
      </div>

      <div>
        <label className="label">Member ID</label>
        <input
          required
          className="input font-mono uppercase"
          placeholder="AM12345678"
          value={memberCode}
          onChange={(e) => setMemberCode(e.target.value)}
          pattern="^AM[0-9]{8}$"
        />
      </div>

      <div>
        <label className="label">Wallet</label>
        <div className="grid grid-cols-2 gap-2 max-w-md">
          <button type="button" onClick={() => setTarget("PIN_WALLET")}
            className={`px-3 py-2 rounded-md border text-sm font-semibold inline-flex items-center justify-center gap-2 ${target === "PIN_WALLET" ? "bg-promax-600 text-white border-promax-700" : "bg-white text-promax-700 border-promax-200 hover:bg-promax-50"}`}>
            <WalletCards className="h-4 w-4" /> Pin Wallet
          </button>
          <button type="button" onClick={() => setTarget("POINTS")}
            className={`px-3 py-2 rounded-md border text-sm font-semibold inline-flex items-center justify-center gap-2 ${target === "POINTS" ? "bg-promax-600 text-white border-promax-700" : "bg-white text-promax-700 border-promax-200 hover:bg-promax-50"}`}>
            <Coins className="h-4 w-4" /> Pro Max points
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {target === "PIN_WALLET"
            ? "Pin Wallet points — shown on the member's Pin Wallet page (logged in their ledger)."
            : "Pro Max earning points — added to the member's payout balance."}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Points</label>
          <input className="input tabular-nums" inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value.replace(/[^0-9]/g, ""))} placeholder="1000" />
        </div>
        <div>
          <label className="label">Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / reference" maxLength={300} />
        </div>
      </div>

      {done && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Added to <strong>{done.name}</strong>. New balance: <strong>{(done.balance / 100).toLocaleString("en-IN")}</strong> points.
        </div>
      )}

      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-promax-700 hover:bg-promax-800 text-white text-sm font-semibold disabled:opacity-60">
        {busy ? "Adding…" : "Add points"}
      </button>
    </form>
  );
}
