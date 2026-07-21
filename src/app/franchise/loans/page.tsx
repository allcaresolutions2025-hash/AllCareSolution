import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFranchiseMemberIds } from "@/lib/franchise";
import { formatRupees, tierByKey } from "@/lib/loan";
import { Pagination } from "@/components/pagination";
import { FranchiseLoanActions } from "./loan-actions";
import { BadgeIndianRupee, Clock, CheckCircle2, Search } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Loan Requests — Franchise" };

// Each table paginates independently, so each owns a distinct query param.
const PAGE_SIZE = 20;

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CLOSED: "bg-slate-100 text-slate-700",
};

function pageNum(v: string | undefined): number {
  return Math.max(1, parseInt(v ?? "1", 10) || 1);
}

export default async function FranchiseLoansPage({
  searchParams,
}: {
  searchParams: { q?: string; ppage?: string; fpage?: string; tpage?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const leaderId = session.user.id;

  const q = (searchParams.q ?? "").trim();
  const ppage = pageNum(searchParams.ppage);
  const fpage = pageNum(searchParams.fpage);
  const tpage = pageNum(searchParams.tpage);

  const memberIds = await getFranchiseMemberIds(leaderId);
  const scopedIds = memberIds.length ? memberIds : ["-"];

  // One search box filters all three tables, matching on the borrower rather
  // than the loan itself — name, email, member ID or phone.
  const searchWhere: Prisma.LoanWhereInput = q
    ? {
        user: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { referralCode: { contains: q.toUpperCase() } },
            { phone: { contains: q } },
            { whatsappNumber: { contains: q } },
          ],
        },
      }
    : {};

  const pendingWhere: Prisma.LoanWhereInput = {
    franchiseId: leaderId,
    franchiseStatus: "PENDING",
    status: "REQUESTED",
    ...searchWhere,
  };
  const forwardedWhere: Prisma.LoanWhereInput = {
    franchiseId: leaderId,
    franchiseStatus: "APPROVED",
    status: "REQUESTED",
    ...searchWhere,
  };
  // Pro Max loans belong to the Pro Max admin, not to a franchise.
  const teamWhere: Prisma.LoanWhereInput = {
    userId: { in: scopedIds },
    proMax: false,
    status: { in: ["APPROVED", "CLOSED", "REJECTED"] },
    ...searchWhere,
  };

  const [pending, pendingTotal, forwarded, forwardedTotal, teamLoans, teamTotal] = await Promise.all([
    prisma.loan.findMany({
      where: pendingWhere,
      orderBy: { requestedAt: "asc" },
      skip: (ppage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: {
          select: { name: true, email: true, referralCode: true, phone: true, whatsappNumber: true, leftLegCount: true, rightLegCount: true },
        },
      },
    }),
    prisma.loan.count({ where: pendingWhere }),
    prisma.loan.findMany({
      where: forwardedWhere,
      orderBy: { franchiseReviewedAt: "desc" },
      skip: (fpage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, referralCode: true } } },
    }),
    prisma.loan.count({ where: forwardedWhere }),
    prisma.loan.findMany({
      where: teamWhere,
      orderBy: { updatedAt: "desc" },
      skip: (tpage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, referralCode: true } },
        installments: { select: { status: true } },
      },
    }),
    prisma.loan.count({ where: teamWhere }),
  ]);

  // Carry the active search and the other tables' page numbers so paging one
  // table doesn't reset the search or the rest.
  const others = (skip: "ppage" | "fpage" | "tpage") => ({
    q: q || undefined,
    ppage: skip !== "ppage" && ppage > 1 ? String(ppage) : undefined,
    fpage: skip !== "fpage" && fpage > 1 ? String(fpage) : undefined,
    tpage: skip !== "tpage" && tpage > 1 ? String(tpage) : undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BadgeIndianRupee className="h-6 w-6 text-franchise-600" /> Loan Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your downline&apos;s loan applications land here first. Approving forwards the request
          to the admin, who does the final approval and disburses the money.
        </p>
      </div>

      {/* Search applies to all three tables below. Submitting drops the page
          params, so results always start from page 1. */}
      <form className="card p-4 flex items-center gap-2" method="get">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by member name, email, member ID or phone…"
          className="input flex-1"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-franchise-gradient text-white font-semibold text-sm shadow-franchise-sm hover:opacity-95 shrink-0"
        >
          Search
        </button>
        {q && (
          <Link href="/franchise/loans" className="btn-outline shrink-0">
            Clear
          </Link>
        )}
      </form>

      {q && (
        <p className="text-sm text-muted-foreground -mt-2">
          Showing results for <span className="font-semibold text-foreground">&ldquo;{q}&rdquo;</span> —{" "}
          {pendingTotal + forwardedTotal + teamTotal} matching loan(s).
        </p>
      )}

      {/* ---- Awaiting my approval ---- */}
      <section className="card overflow-hidden">
        <h2 className="font-semibold flex items-center gap-2 p-5 pb-4">
          <Clock className="h-4 w-4 text-amber-600" /> Awaiting your approval ({pendingTotal})
        </h2>
        {pendingTotal === 0 ? (
          <p className="text-sm text-muted-foreground px-5 pb-5">
            {q ? "No matching requests awaiting your approval." : "Nothing waiting on you right now."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto px-5">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-3">Member</th>
                    <th className="text-left py-2 pr-3">Loan</th>
                    <th className="text-left py-2 pr-3">Team</th>
                    <th className="text-left py-2 pr-3">Requested</th>
                    <th className="text-right py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pending.map((l) => (
                    <tr key={l.id}>
                      <td className="py-3 pr-3">
                        <div className="font-medium">{l.user.name}</div>
                        <div className="text-xs text-muted-foreground">{l.user.referralCode}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-semibold tabular-nums">{formatRupees(l.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {tierByKey(l.tierKey)?.label ?? l.tierKey} · {l.totalWeeks}w
                        </div>
                      </td>
                      <td className="py-3 pr-3 tabular-nums text-xs">
                        L {l.user.leftLegCount} / R {l.user.rightLegCount}
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        {l.requestedAt.toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3 text-right">
                        <FranchiseLoanActions id={l.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={ppage}
              pageSize={PAGE_SIZE}
              total={pendingTotal}
              basePath="/franchise/loans"
              pageParam="ppage"
              params={others("ppage")}
              variant="franchise"
            />
          </>
        )}
      </section>

      {/* ---- Forwarded, waiting on admin ---- */}
      <section className="card overflow-hidden">
        <h2 className="font-semibold flex items-center gap-2 p-5 pb-4">
          <CheckCircle2 className="h-4 w-4 text-franchise-600" /> Forwarded to admin ({forwardedTotal})
        </h2>
        {forwardedTotal === 0 ? (
          <p className="text-sm text-muted-foreground px-5 pb-5">
            {q ? "No matching requests with the admin." : "Nothing pending with the admin."}
          </p>
        ) : (
          <>
            <ul className="divide-y px-5">
              {forwarded.map((l) => (
                <li key={l.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="font-medium">{l.user.name}</span>{" "}
                    <span className="text-xs text-muted-foreground">{l.user.referralCode}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums font-semibold">{formatRupees(l.amount)}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-franchise-100 text-franchise-700">
                      Awaiting admin
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination
              page={fpage}
              pageSize={PAGE_SIZE}
              total={forwardedTotal}
              basePath="/franchise/loans"
              pageParam="fpage"
              params={others("fpage")}
              variant="franchise"
            />
          </>
        )}
      </section>

      {/* ---- Team loan status ---- */}
      <section className="card overflow-hidden">
        <h2 className="font-semibold p-5 pb-4">Team loan status ({teamTotal})</h2>
        {teamTotal === 0 ? (
          <p className="text-sm text-muted-foreground px-5 pb-5">
            {q ? "No matching loans in your team." : "No loans in your team yet."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto px-5">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-3">Member</th>
                    <th className="text-left py-2 pr-3">Amount</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-left py-2 pr-3">Repaid</th>
                    <th className="text-left py-2">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {teamLoans.map((l) => {
                    const verified = l.installments.filter((i) => i.status === "VERIFIED").length;
                    return (
                      <tr key={l.id}>
                        <td className="py-3 pr-3">
                          <div className="font-medium">{l.user.name}</div>
                          <div className="text-xs text-muted-foreground">{l.user.referralCode}</div>
                        </td>
                        <td className="py-3 pr-3 tabular-nums font-semibold">{formatRupees(l.amount)}</td>
                        <td className="py-3 pr-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[l.status] ?? "bg-slate-100 text-slate-700"}`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 pr-3 tabular-nums text-xs">
                          {verified} / {l.installments.length || l.totalWeeks}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {l.dueDate ? l.dueDate.toLocaleDateString("en-IN") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={tpage}
              pageSize={PAGE_SIZE}
              total={teamTotal}
              basePath="/franchise/loans"
              pageParam="tpage"
              params={others("tpage")}
              variant="franchise"
            />
          </>
        )}
      </section>
    </div>
  );
}
