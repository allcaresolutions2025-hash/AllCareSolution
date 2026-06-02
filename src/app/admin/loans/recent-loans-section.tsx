"use client";

import { useMemo, useState } from "react";
import { formatRupees } from "@/lib/loan";
import { SearchBox } from "./pending-loans-section";

export type RecentLoanRow = {
  id: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
  userCode: string;
  tierLabel: string;
  amount: number;
  totalWeeks: number;
  status: "APPROVED" | "CLOSED" | "REJECTED";
};

function matches(row: RecentLoanRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().trim();
  return (
    row.userName.toLowerCase().includes(needle) ||
    row.userEmail.toLowerCase().includes(needle) ||
    row.userCode.toLowerCase().includes(needle) ||
    row.tierLabel.toLowerCase().includes(needle) ||
    row.status.toLowerCase().includes(needle)
  );
}

export function RecentLoansSection({ rows }: { rows: RecentLoanRow[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => rows.filter((r) => matches(r, q)), [rows, q]);

  return (
    <div className="card overflow-hidden">
      <div className="p-5 border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-semibold">Recent loans ({rows.length})</h2>
          <SearchBox value={q} onChange={setQ} placeholder="Search name / email / code / tier…" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No history yet.</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No loans match &ldquo;{q}&rdquo;.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium text-right">Amount</th>
                <th className="px-4 py-2 font-medium text-right">Weeks</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {new Date(l.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{l.userName}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.userEmail} · <code className="font-mono">{l.userCode}</code>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs">{l.tierLabel}</td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">{formatRupees(l.amount)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{l.totalWeeks}</td>
                  <td className="px-4 py-2">
                    {l.status === "APPROVED" ? <span className="badge-green">Active</span>
                      : l.status === "CLOSED" ? <span className="badge-blue">Cleared</span>
                      : <span className="badge-red">Rejected</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
