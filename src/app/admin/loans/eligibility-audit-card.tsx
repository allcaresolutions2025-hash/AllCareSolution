"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ShieldAlert, Lock, RefreshCw } from "lucide-react";
import { formatRupees } from "@/lib/loan";
import type { LoanAuditRow } from "@/lib/loan-audit";

export function EligibilityAuditCard() {
  const router = useRouter();
  const [rows, setRows] = useState<LoanAuditRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/loans/eligibility-audit");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load audit");
      setRows(json.rows as LoanAuditRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load audit");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ineligible = (rows ?? []).filter((r) => !r.eligible);

  async function lockAll() {
    if (ineligible.length === 0) return;
    if (
      !window.confirm(
        `Lock (reject) ${ineligible.length} loan request${ineligible.length === 1 ? "" : "s"} from members who no longer qualify? Already-approved loans are not affected.`,
      )
    ) {
      return;
    }
    setLocking(true);
    try {
      const res = await fetch("/api/admin/loans/eligibility-audit", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to lock requests");
      toast.success(`Locked ${json.locked} ineligible request${json.locked === 1 ? "" : "s"}.`);
      await load();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to lock requests");
    } finally {
      setLocking(false);
    }
  }

  // Nothing pending review, or everyone qualifies — keep the card quiet.
  if (loading) {
    return (
      <div className="card p-5 text-sm text-muted-foreground flex items-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" /> Checking pending loan requests…
      </div>
    );
  }
  if (ineligible.length === 0) return null;

  return (
    <div className="card overflow-hidden ring-1 ring-amber-200">
      <div className="p-5 border-b bg-amber-50/60 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Ineligible loan requests ({ineligible.length})</h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-prose">
              These members have a pending request but their binary tree is <strong>not completely
              filled</strong> to the loan&apos;s level (an empty slot somewhere on Left or Right).
              Locking rejects the request; they can re-apply once both legs are filled. Approved
              loans are never touched.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={lockAll}
          disabled={locking}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 shrink-0"
        >
          <Lock className="h-3.5 w-3.5" />
          {locking ? "Locking…" : `Lock ${ineligible.length} request${ineligible.length === 1 ? "" : "s"}`}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Member</th>
              <th className="px-4 py-2 font-medium">Requested loan</th>
              <th className="px-4 py-2 font-medium text-right">Needs / side</th>
              <th className="px-4 py-2 font-medium text-right">Filled L / R</th>
            </tr>
          </thead>
          <tbody>
            {ineligible.map((r) => (
              <tr key={r.loanId} className="border-t">
                <td className="px-4 py-2">
                  <div className="font-medium">{r.userName}</div>
                  <div className="text-xs font-mono text-muted-foreground">{r.userCode}</div>
                </td>
                <td className="px-4 py-2">
                  <div className="font-medium tabular-nums">{formatRupees(r.amount)}</div>
                  <div className="text-xs text-muted-foreground">Level {r.requiredLevel}</div>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{r.requiredPerSide}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  <span className={r.leftFillDepth >= r.requiredLevel ? "text-emerald-700" : "text-red-600 font-semibold"}>
                    L{r.leftFillDepth}
                  </span>{" "}
                  /{" "}
                  <span className={r.rightFillDepth >= r.requiredLevel ? "text-emerald-700" : "text-red-600 font-semibold"}>
                    R{r.rightFillDepth}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
