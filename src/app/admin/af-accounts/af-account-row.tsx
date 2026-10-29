"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatPoints } from "@/lib/money";

export type AfAccountRowData = {
  id: string;
  afId: string;
  name: string;
  phone: string | null;
  placement: string | null; // "AF12345678 · left"
  packageTotal: number;
  afWallet: number;
  eWallet: number;
  createdAt: string;
};

export function AfAccountRow({ row }: { row: AfAccountRowData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(points);
    if (!isFinite(n) || n <= 0) return toast.error("Enter a positive points amount");
    if (!confirm(`Add ${n.toLocaleString("en-IN")} pts to ${row.name} (${row.afId})'s AF wallet?`)) return;
    setLoading(true);
    const res = await fetch("/api/admin/af/wallet/credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: row.id, points: n, note: note.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not credit AF wallet");
      return;
    }
    toast.success(`Added ${n.toLocaleString("en-IN")} pts. New AF wallet balance ${formatPoints(data.newBalance)}`);
    setPoints("");
    setNote("");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <tr className="border-t align-top">
        <td className="px-4 py-3">
          <div className="font-medium">{row.name}</div>
          <div className="text-xs font-mono text-muted-foreground">{row.afId}</div>
          {row.phone && <div className="text-xs text-muted-foreground">{row.phone}</div>}
        </td>
        <td className="px-4 py-3 text-xs">
          {row.placement ? <span className="font-mono">{row.placement}</span> : <span className="text-muted-foreground">Top level</span>}
        </td>
        <td className="px-4 py-3 tabular-nums">{formatPoints(row.packageTotal)}</td>
        <td className="px-4 py-3 tabular-nums font-semibold text-af-700">{formatPoints(row.afWallet)}</td>
        <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatPoints(row.eWallet)}</td>
        <td className="px-4 py-3">
          <button onClick={() => setOpen((v) => !v)} className="btn-primary text-xs px-3 py-1">
            {open ? "Close" : "Add points"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-af-50/40">
          <td colSpan={6} className="px-4 py-4">
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[160px_1fr_auto] items-end">
              <div>
                <label className="label">Points to add</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input tabular-nums"
                  value={points}
                  onChange={(e) => setPoints(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="e.g. 500"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Note (shown to the account)</label>
                <input
                  className="input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason / reference"
                  maxLength={300}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Adding…" : "Add to AF wallet"}
              </button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
