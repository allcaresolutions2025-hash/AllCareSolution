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
  isActive: boolean;
  removedAt: string | null;
  daysActive: number | null; // days from AF ID creation to today, or to removal
  firstPackageAt: string | null; // first approved package
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function plural(n: number, word: string) {
  return `${n.toLocaleString("en-IN")} ${word}${n === 1 ? "" : "s"}`;
}

export function AfAccountRow({ row }: { row: AfAccountRowData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);

  async function toggleAccess() {
    const active = !row.isActive;
    let reason: string | undefined;
    if (active) {
      if (!confirm(`Restore AF access for ${row.name} (${row.afId})?`)) return;
    } else {
      const days = row.daysActive === null ? "" : ` It has been active for ${plural(row.daysActive, "day")}.`;
      const input = prompt(
        `Remove AF access for ${row.name} (${row.afId})?${days}\n\nThe account will be signed out and can no longer use the AF portal or withdraw. You can restore it later.\n\nReason (optional, shown to the account):`,
      );
      if (input === null) return;
      reason = input.trim() || undefined;
    }
    setAccessLoading(true);
    const res = await fetch(`/api/admin/af/accounts/${row.id}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active, reason }),
    });
    const data = await res.json().catch(() => ({}));
    setAccessLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Could not update AF access");
      return;
    }
    toast.success(active ? `AF access restored for ${row.afId}` : `AF access removed for ${row.afId}`);
    router.refresh();
  }

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
      <tr className={`border-t align-top ${row.isActive ? "" : "bg-red-50/40"}`}>
        <td className="px-4 py-3">
          <div className="font-medium">
            {row.name}
            {!row.isActive && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                Access removed
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-muted-foreground">{row.afId}</div>
          {row.phone && <div className="text-xs text-muted-foreground">{row.phone}</div>}
        </td>
        <td className="px-4 py-3 text-xs">
          {row.placement ? <span className="font-mono">{row.placement}</span> : <span className="text-muted-foreground">Top level</span>}
        </td>
        <td className="px-4 py-3 text-xs">
          <div className="text-sm font-semibold tabular-nums">
            {row.daysActive === null ? "—" : plural(row.daysActive, "day")}
          </div>
          <div className="text-muted-foreground">
            {fmtDate(row.createdAt)} → {row.isActive ? "today" : row.removedAt ? fmtDate(row.removedAt) : "removed"}
          </div>
          <div className="text-muted-foreground">
            {row.firstPackageAt ? `1st package ${fmtDate(row.firstPackageAt)}` : "No package yet"}
          </div>
        </td>
        <td className="px-4 py-3 tabular-nums">{formatPoints(row.packageTotal)}</td>
        <td className="px-4 py-3 tabular-nums font-semibold text-af-700">{formatPoints(row.afWallet)}</td>
        <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatPoints(row.eWallet)}</td>
        <td className="px-4 py-3">
          <div className="flex flex-col items-start gap-1.5">
            {row.isActive && (
              <button onClick={() => setOpen((v) => !v)} className="btn-primary text-xs px-3 py-1">
                {open ? "Close" : "Add points"}
              </button>
            )}
            <button
              onClick={toggleAccess}
              disabled={accessLoading}
              className={
                row.isActive
                  ? "rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  : "btn-outline text-xs px-3 py-1"
              }
            >
              {accessLoading ? "Saving…" : row.isActive ? "Remove access" : "Restore access"}
            </button>
          </div>
        </td>
      </tr>
      {open && row.isActive && (
        <tr className="bg-af-50/40">
          <td colSpan={7} className="px-4 py-4">
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
