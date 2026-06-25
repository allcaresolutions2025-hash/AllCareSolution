"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, RotateCcw, CheckSquare } from "lucide-react";
import { formatPoints } from "@/lib/money";

export type PendingPayout = {
  id: string;
  runDate: string;
  userName: string;
  userEmail: string;
  userCode: string;
  leftLegCount: number;
  rightLegCount: number;
  startBalance: number;
  paidAmount: number;
  forfeitAmount: number;
  proMax: boolean;
};

export function PendingPayoutsTable({ payouts }: { payouts: PendingPayout[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const allIds = useMemo(() => payouts.map((p) => p.id), [payouts]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }

  const selectedRows = payouts.filter((p) => selected.has(p.id));
  const selectedTotalPay = selectedRows.reduce((s, p) => s + p.paidAmount, 0);
  const selectedTotalRestore = selectedRows.reduce((s, p) => s + p.startBalance, 0);

  async function bulkPay() {
    if (selected.size === 0 || busy) return;
    if (
      !confirm(
        `Mark ${selected.size} payout${selected.size === 1 ? "" : "s"} as PAID?\n\n` +
          `Total disbursed: ${formatPoints(selectedTotalPay)}.\n` +
          `Confirm you have paid each user offline.`
      )
    ) return;
    setBusy(true);
    const res = await fetch("/api/admin/daily-payouts/bulk-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || "Bulk pay failed");
      return;
    }
    toast.success(`Marked ${json.paidCount} payout${json.paidCount === 1 ? "" : "s"} paid`);
    setSelected(new Set());
    router.refresh();
  }

  async function bulkUnpaid() {
    if (selected.size === 0 || busy) return;
    if (
      !confirm(
        `Mark ${selected.size} payout${selected.size === 1 ? "" : "s"} as UNPAID?\n\n` +
          `${formatPoints(selectedTotalRestore)} will be restored to those users' balances.`
      )
    ) return;
    setBusy(true);
    const res = await fetch("/api/admin/daily-payouts/bulk-unpaid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || "Bulk unpaid failed");
      return;
    }
    toast.success(
      `Restored ${formatPoints(json.totalRestored)} to ${json.restoredCount} user${json.restoredCount === 1 ? "" : "s"}`,
    );
    setSelected(new Set());
    router.refresh();
  }

  async function singleAct(id: string, action: "pay" | "unpaid", row: PendingPayout) {
    if (busy) return;
    if (
      action === "pay" &&
      !confirm(`Confirm you paid ${formatPoints(row.paidAmount)} offline to ${row.userName} for ${row.runDate}?`)
    ) return;
    if (
      action === "unpaid" &&
      !confirm(
        `Mark as UNPAID? ${formatPoints(row.startBalance)} will be restored to ${row.userName}'s balance.`,
      )
    ) return;
    setBusy(true);
    const res = await fetch(`/api/admin/daily-payouts/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || `${action} failed`);
      return;
    }
    toast.success(action === "pay" ? "Marked paid" : `Restored ${formatPoints(row.startBalance)}`);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    router.refresh();
  }

  if (payouts.length === 0) {
    return <div className="p-8 text-center text-sm text-muted-foreground">No pending payouts.</div>;
  }

  return (
    <>
      <div className="px-5 py-3 border-b bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground">
          {selected.size === 0
            ? "Select rows to bulk-pay or bulk-unpaid."
            : `${selected.size} selected · pay ${formatPoints(selectedTotalPay)} · restore ${formatPoints(selectedTotalRestore)}`}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={bulkPay}
            disabled={selected.size === 0 || busy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {busy ? "Working…" : `Mark ${selected.size || ""} selected paid`.trim()}
          </button>
          <button
            onClick={bulkUnpaid}
            disabled={selected.size === 0 || busy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-white text-amber-700 border border-amber-300 hover:bg-amber-50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {`Mark ${selected.size || ""} selected unpaid`.trim()}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer accent-emerald-600"
                  aria-label="Select all pending payouts"
                />
              </th>
              <th className="px-4 py-2 font-medium">Run Date (IST)</th>
              <th className="px-4 py-2 font-medium">Member</th>
              <th className="px-4 py-2 font-medium text-center">Legs (L / R)</th>
              <th className="px-4 py-2 font-medium text-right">Start</th>
              <th className="px-4 py-2 font-medium text-right">Pay (90%)</th>
              <th className="px-4 py-2 font-medium text-right">Forfeit (10%)</th>
              <th className="px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => {
              const checked = selected.has(p.id);
              return (
                <tr key={p.id} className={`border-t ${checked ? "bg-emerald-50/60" : ""}`}>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(p.id)}
                      className="h-4 w-4 cursor-pointer accent-emerald-600"
                      aria-label={`Select ${p.userName}`}
                    />
                  </td>
                  <td className="px-4 py-2 text-xs font-mono">{p.runDate}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium flex items-center gap-2">
                      {p.userName}
                      {p.proMax && (
                        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          PRO MAX
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.userEmail} · <code className="font-mono">{p.userCode}</code>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="inline-flex items-center gap-1 text-xs tabular-nums">
                      <span
                        className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-mono"
                        title="Left leg member count"
                      >
                        L {p.leftLegCount}
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span
                        className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-800 border border-violet-200 font-mono"
                        title="Right leg member count"
                      >
                        R {p.rightLegCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                    {formatPoints(p.startBalance)}
                  </td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums text-brand-700">
                    {formatPoints(p.paidAmount)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                    {formatPoints(p.forfeitAmount)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => singleAct(p.id, "pay", p)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark Paid
                      </button>
                      <button
                        onClick={() => singleAct(p.id, "unpaid", p)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white text-amber-700 border border-amber-300 hover:bg-amber-50 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Mark Unpaid
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
