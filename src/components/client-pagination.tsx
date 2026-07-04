"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Client-side pagination bar for tables whose full row set already lives in
 * memory (filtered/searched client components). Mirrors the look of the
 * server-rendered <Pagination>, but drives an in-memory page via `onPageChange`.
 */
export function ClientPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  const pages: (number | "…")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= current - 1 && p <= current + 1)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
      <p className="text-sm text-muted-foreground order-2 sm:order-1">
        Showing <span className="font-semibold text-foreground">{start}-{end}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span> entries
      </p>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1.5 order-1 sm:order-2 flex-wrap justify-center">
          <PageBtn onClick={() => onPageChange(current - 1)} disabled={current === 1}>
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </PageBtn>

          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-2 text-muted-foreground select-none">
                …
              </span>
            ) : p === current ? (
              <span
                key={p}
                aria-current="page"
                className="min-w-9 h-9 px-3 grid place-items-center rounded-md border border-brand-600 bg-brand-600 text-white text-sm font-medium"
              >
                {p}
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className="min-w-9 h-9 px-3 grid place-items-center rounded-md border border-input bg-white text-sm hover:bg-muted/50"
              >
                {p}
              </button>
            ),
          )}

          <PageBtn onClick={() => onPageChange(current + 1)} disabled={current === totalPages}>
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </PageBtn>
        </nav>
      )}
    </div>
  );
}

function PageBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-input bg-white text-sm hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}
