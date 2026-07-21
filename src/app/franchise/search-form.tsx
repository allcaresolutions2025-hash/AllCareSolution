import Link from "next/link";
import { Search } from "lucide-react";

/**
 * Search bar shared by the franchise portal tables. A plain GET form, so it
 * works without client JS: submitting replaces the whole query string, which
 * drops any page params and starts results from page 1. The page links put the
 * query back via their `params`, so paging keeps the search.
 */
export function FranchiseSearchForm({
  basePath,
  q,
  placeholder = "Search by member name, email, member ID or phone…",
}: {
  basePath: string;
  q: string;
  placeholder?: string;
}) {
  return (
    <form className="card p-4 flex items-center gap-2" method="get">
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <input name="q" defaultValue={q} placeholder={placeholder} className="input flex-1" />
      <button
        type="submit"
        className="px-4 py-2 rounded-xl bg-franchise-gradient text-white font-semibold text-sm shadow-franchise-sm hover:opacity-95 shrink-0"
      >
        Search
      </button>
      {q && (
        <Link href={basePath} className="btn-outline shrink-0">
          Clear
        </Link>
      )}
    </form>
  );
}

/** "Showing results for X — N matching item(s)." Rendered only while searching. */
export function SearchSummary({ q, total, noun }: { q: string; total: number; noun: string }) {
  if (!q) return null;
  return (
    <p className="text-sm text-muted-foreground -mt-2">
      Showing results for <span className="font-semibold text-foreground">&ldquo;{q}&rdquo;</span> —{" "}
      {total} matching {noun}
      {total === 1 ? "" : "s"}.
    </p>
  );
}
