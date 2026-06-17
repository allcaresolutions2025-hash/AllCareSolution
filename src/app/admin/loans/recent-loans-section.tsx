"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatRupees } from "@/lib/loan";
import { SearchBox } from "./pending-loans-section";

const PAGE_SIZE = 20;

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
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => rows.filter((r) => matches(r, q)), [rows, q]);

  // A new search resets to the first page so results aren't hidden on page 2+.
  useEffect(() => {
    setPage(1);
  }, [q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const start = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
  const end = Math.min(current * PAGE_SIZE, filtered.length);

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
              {pageRows.map((l) => (
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground order-2 sm:order-1">
              Showing{" "}
              <span className="font-semibold text-foreground">{start}-{end}</span> of{" "}
              <span className="font-semibold text-foreground">{filtered.length}</span> entries
            </p>
            {totalPages > 1 && (
              <nav className="flex items-center gap-1.5 order-1 sm:order-2 flex-wrap justify-center">
                <PageButton onClick={() => setPage(current - 1)} disabled={current === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </PageButton>
                {pageWindow(current, totalPages).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`} className="px-2 text-muted-foreground select-none">…</span>
                  ) : (
                    <PageButton key={p} onClick={() => setPage(p)} active={p === current}>
                      {p}
                    </PageButton>
                  )
                )}
                <PageButton onClick={() => setPage(current + 1)} disabled={current === totalPages}>
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </PageButton>
              </nav>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact page window: first + last + current's neighbours, "…" for the gaps.
function pageWindow(current: number, totalPages: number): (number | "…")[] {
  const pages: (number | "…")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= current - 1 && p <= current + 1)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }
  return pages;
}

function PageButton({
  onClick,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center gap-1 min-w-9 h-9 justify-center rounded-lg border px-3 text-sm font-medium transition-colors";
  if (disabled) {
    return (
      <span className={`${base} border-border bg-muted/40 text-muted-foreground/50 cursor-not-allowed`}>
        {children}
      </span>
    );
  }
  if (active) {
    return (
      <span aria-current="page" className={`${base} border-brand-600 bg-brand-600 text-white`}>
        {children}
      </span>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${base} border-border bg-white hover:bg-muted`}>
      {children}
    </button>
  );
}
