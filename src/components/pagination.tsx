import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Server-rendered pagination bar for admin tables.
 *
 * Renders "Showing X-Y of Z entries" plus a numbered page strip
 * (Previous · 1 · 2 · 3 · … · N · Next). Built from <Link>s so it works
 * inside server components with no client JS. Other active query params
 * (search `q`, `status` filters, …) are preserved across page changes via
 * the `params` prop.
 */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params = {},
  pageParam = "page",
  variant = "brand",
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
  /**
   * Query-string key this control writes its page number to. Defaults to
   * "page"; pass a unique key (e.g. "histPage") when a single page hosts
   * more than one independent paginated table.
   */
  pageParam?: string;
  /** Active-page colour — matches the portal the table lives in. */
  variant?: "brand" | "franchise";
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  function href(p: number) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") sp.set(k, v);
    }
    if (p > 1) sp.set(pageParam, String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  // Build a compact page window: always show first + last, the current page
  // and its immediate neighbours, with "…" gaps collapsing the rest.
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
        Showing{" "}
        <span className="font-semibold text-foreground">
          {start}-{end}
        </span>{" "}
        of <span className="font-semibold text-foreground">{total}</span> entries
      </p>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1.5 order-1 sm:order-2 flex-wrap justify-center">
          <PageLink href={href(current - 1)} disabled={current === 1}>
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </PageLink>

          {pages.map((p, i) =>
            p === "…" ? (
              <span
                key={`gap-${i}`}
                className="px-2 text-muted-foreground select-none"
              >
                …
              </span>
            ) : (
              <PageLink key={p} href={href(p)} active={p === current} variant={variant}>
                {p}
              </PageLink>
            )
          )}

          <PageLink href={href(current + 1)} disabled={current === totalPages}>
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  href,
  active,
  disabled,
  children,
  variant = "brand",
}: {
  href: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "brand" | "franchise";
}) {
  const base =
    "inline-flex items-center gap-1 min-w-9 h-9 justify-center rounded-lg border px-3 text-sm font-medium transition-colors";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${base} border-border bg-muted/40 text-muted-foreground/50 cursor-not-allowed`}
      >
        {children}
      </span>
    );
  }
  if (active) {
    const activeCls =
      variant === "franchise"
        ? "border-franchise-600 bg-franchise-600 text-white"
        : "border-brand-600 bg-brand-600 text-white";
    return (
      <span aria-current="page" className={`${base} ${activeCls}`}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      className={`${base} border-border bg-white hover:bg-muted`}
    >
      {children}
    </Link>
  );
}
