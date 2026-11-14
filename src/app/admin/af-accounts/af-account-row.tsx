"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatPoints } from "@/lib/money";

export type AfPackageData = {
  id: string;
  amount: number; // paise
  bv: number;
  productName: string;
  removed: boolean;
  approvedAt: string;
  removedAt: string | null;
  removeReason: string | null;
  daysActive: number; // approval → today, or → removal
};

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
  isActive: boolean; // false only for accounts whose access was removed earlier
  packages: AfPackageData[]; // approved + removed, oldest first
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function plural(n: number, word: string) {
  return `${n.toLocaleString("en-IN")} ${word}${n === 1 ? "" : "s"}`;
}

type Panel = "points" | "packages" | null;

export function AfAccountRow({ row }: { row: AfAccountRowData }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const active = row.packages.filter((p) => !p.removed);
  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));

  async function removePackage(pkg: AfPackageData) {
    const reason = prompt(
      `Remove the ${formatPoints(pkg.amount)} package (${pkg.productName}) from ${row.name} (${row.afId})?\n\n` +
        `It has been active for ${plural(pkg.daysActive, "day")}, since ${fmtDate(pkg.approvedAt)}.\n\n` +
        `The account itself stays. This package stops counting towards its package total, and BV it sent up the ` +
        `tree that hasn't been matched yet is taken back. Income already paid is kept.` +
        (active.length === 1 ? ` This is the account's only active package, so it will stop earning until it gets a new one.` : "") +
        `\n\nReason (optional, shown to the account):`,
    );
    if (reason === null) return;
    setBusyId(pkg.id);
    const res = await fetch(`/api/admin/af/packages/${pkg.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", note: reason.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      toast.error(data.error || "Could not remove the package");
      return;
    }
    toast.success(`Package removed after ${plural(data.daysActive, "day")} active.`);
    router.refresh();
  }

  async function restoreAccess() {
    if (!confirm(`Restore AF access for ${row.name} (${row.afId})?`)) return;
    setBusyId("access");
    const res = await fetch(`/api/admin/af/accounts/${row.id}/access`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      toast.error(data.error || "Could not restore AF access");
      return;
    }
    toast.success(`AF access restored for ${row.afId}`);
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
    setPanel(null);
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
        <td className="px-4 py-3">
          <div className="tabular-nums">{formatPoints(row.packageTotal)}</div>
          {active.length === 0 ? (
            <div className="text-xs text-muted-foreground">No active package</div>
          ) : (
            <ul className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
              {active.map((p) => (
                <li key={p.id} className="whitespace-nowrap">
                  {formatPoints(p.amount)} · <span className="font-medium text-foreground">{plural(p.daysActive, "day")}</span> active
                </li>
              ))}
            </ul>
          )}
        </td>
        <td className="px-4 py-3 tabular-nums font-semibold text-af-700">{formatPoints(row.afWallet)}</td>
        <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatPoints(row.eWallet)}</td>
        <td className="px-4 py-3">
          <div className="flex flex-col items-start gap-1.5">
            {row.isActive ? (
              <button onClick={() => toggle("points")} className="btn-primary text-xs px-3 py-1">
                {panel === "points" ? "Close" : "Add points"}
              </button>
            ) : (
              <button onClick={restoreAccess} disabled={busyId === "access"} className="btn-outline text-xs px-3 py-1">
                {busyId === "access" ? "Saving…" : "Restore access"}
              </button>
            )}
            {row.packages.length > 0 && (
              <button onClick={() => toggle("packages")} className="btn-outline text-xs px-3 py-1">
                {panel === "packages" ? "Close" : `Packages (${active.length})`}
              </button>
            )}
          </div>
        </td>
      </tr>
      {panel === "packages" && (
        <tr className="bg-muted/30">
          <td colSpan={6} className="px-4 py-4">
            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Package</th>
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">Active</th>
                    <th className="px-3 py-2 font-medium">Days active</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {row.packages.map((p) => (
                    <tr key={p.id} className={`border-t align-top ${p.removed ? "text-muted-foreground" : ""}`}>
                      <td className="px-3 py-2">
                        <div className="text-sm font-medium tabular-nums">{formatPoints(p.amount)}</div>
                        <div>{p.bv} BV</div>
                      </td>
                      <td className="px-3 py-2">{p.productName}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {fmtDate(p.approvedAt)} → {p.removed && p.removedAt ? fmtDate(p.removedAt) : "today"}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold tabular-nums">{plural(p.daysActive, "day")}</td>
                      <td className="px-3 py-2 text-right">
                        {p.removed ? (
                          <div>
                            <span className="badge-gray">REMOVED</span>
                            {p.removeReason && <div className="mt-1 max-w-[200px] text-left">“{p.removeReason}”</div>}
                          </div>
                        ) : (
                          <button
                            onClick={() => removePackage(p)}
                            disabled={busyId !== null}
                            className="rounded-lg border border-red-300 px-3 py-1 font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            {busyId === p.id ? "Removing…" : "Remove package"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
      {panel === "points" && row.isActive && (
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
