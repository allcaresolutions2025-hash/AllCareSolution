import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFranchiseMemberIds, whatsappLink, memberSearchWhere } from "@/lib/franchise";
import { formatRupees, daysOverdueIst, calcTotalPenalty } from "@/lib/loan";
import { Pagination } from "@/components/pagination";
import { FranchiseSearchForm, SearchSummary } from "../search-form";
import { AlertTriangle, MessageCircle, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unpaid Loans — Franchise" };

const PAGE_SIZE = 20;

function pageNum(v: string | undefined): number {
  return Math.max(1, parseInt(v ?? "1", 10) || 1);
}

export default async function FranchiseUnpaidPage({
  searchParams,
}: {
  searchParams: { q?: string; opage?: string; spage?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const q = (searchParams.q ?? "").trim();
  const opage = pageNum(searchParams.opage);
  const spage = pageNum(searchParams.spage);

  const memberIds = await getFranchiseMemberIds(session.user.id);
  const scopedIds = memberIds.length ? memberIds : ["-"];
  const now = new Date();

  const memberSelect = {
    select: { name: true, referralCode: true, phone: true, whatsappNumber: true },
  };

  // Both tables search the same way — by the member who owes the instalment.
  const userSearch = memberSearchWhere(q);
  const loanWhere: Prisma.LoanWhereInput = {
    status: "APPROVED",
    proMax: false,
    userId: { in: scopedIds },
    ...(userSearch ? { user: userSearch } : {}),
  };

  const overdueWhere: Prisma.LoanInstallmentWhereInput = {
    status: "PENDING",
    dueDate: { lt: now },
    loan: loanWhere,
  };
  const dueSoonWhere: Prisma.LoanInstallmentWhereInput = {
    status: "PENDING",
    dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    loan: loanWhere,
  };

  const [overdue, overdueTotal, dueSoon, dueSoonTotal] = await Promise.all([
    prisma.loanInstallment.findMany({
      where: overdueWhere,
      orderBy: { dueDate: "asc" },
      skip: (opage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { loan: { select: { id: true, amount: true, user: memberSelect } } },
    }),
    prisma.loanInstallment.count({ where: overdueWhere }),
    prisma.loanInstallment.findMany({
      where: dueSoonWhere,
      orderBy: { dueDate: "asc" },
      skip: (spage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { loan: { select: { amount: true, user: memberSelect } } },
    }),
    prisma.loanInstallment.count({ where: dueSoonWhere }),
  ]);

  const others = (skip: "opage" | "spage") => ({
    q: q || undefined,
    opage: skip !== "opage" && opage > 1 ? String(opage) : undefined,
    spage: skip !== "spage" && spage > 1 ? String(spage) : undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-600" /> Unpaid Loans
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Members in your team who have missed a repayment date. Reach out on WhatsApp to follow up.
        </p>
      </div>

      <FranchiseSearchForm basePath="/franchise/unpaid" q={q} />
      <SearchSummary q={q} total={overdueTotal + dueSoonTotal} noun="instalment" />

      <section className="card overflow-hidden">
        <h2 className="font-semibold flex items-center gap-2 p-5 pb-4">
          <AlertTriangle className="h-4 w-4 text-red-600" /> Overdue ({overdueTotal})
        </h2>
        {overdueTotal === 0 ? (
          <p className="text-sm text-muted-foreground px-5 pb-5">
            {q ? "No overdue instalments match this search." : "Nobody in your team is overdue. Nice work."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto px-5">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 pr-3">Member</th>
                    <th className="text-left py-2 pr-3">Week</th>
                    <th className="text-left py-2 pr-3">Amount</th>
                    <th className="text-left py-2 pr-3">Due</th>
                    <th className="text-left py-2 pr-3">Overdue</th>
                    <th className="text-right py-2">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {overdue.map((i) => {
                    const days = daysOverdueIst(i.dueDate, now);
                    const penalty = calcTotalPenalty(i.loan.amount, days);
                    const u = i.loan.user;
                    const msg = `Hello ${u.name}, this is a reminder from your ACHT MART franchise. Your loan instalment of ${formatRupees(i.amount)} (week ${i.weekNumber}) was due on ${i.dueDate.toLocaleDateString("en-IN")} and is now ${days} day(s) overdue. Please make the payment at the earliest.`;
                    const link = whatsappLink(u.whatsappNumber ?? u.phone, msg);
                    return (
                      <tr key={i.id}>
                        <td className="py-3 pr-3">
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.referralCode}</div>
                        </td>
                        <td className="py-3 pr-3 tabular-nums text-xs">#{i.weekNumber}</td>
                        <td className="py-3 pr-3">
                          <div className="font-semibold tabular-nums">{formatRupees(i.amount)}</div>
                          {penalty > 0 && (
                            <div className="text-xs text-red-600">+{formatRupees(penalty)} penalty</div>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-xs text-muted-foreground">
                          {i.dueDate.toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 tabular-nums">
                            {days}d
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">No number</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={opage}
              pageSize={PAGE_SIZE}
              total={overdueTotal}
              basePath="/franchise/unpaid"
              pageParam="opage"
              params={others("opage")}
              variant="franchise"
            />
          </>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="font-semibold flex items-center gap-2 p-5 pb-4">
          <CalendarDays className="h-4 w-4 text-amber-600" /> Due in the next 7 days ({dueSoonTotal})
        </h2>
        {dueSoonTotal === 0 ? (
          <p className="text-sm text-muted-foreground px-5 pb-5">
            {q ? "Nothing due this week matches this search." : "Nothing falling due this week."}
          </p>
        ) : (
          <>
            <ul className="divide-y px-5">
              {dueSoon.map((i) => {
                const u = i.loan.user;
                const msg = `Hello ${u.name}, a friendly reminder from your ACHT MART franchise: your loan instalment of ${formatRupees(i.amount)} (week ${i.weekNumber}) is due on ${i.dueDate.toLocaleDateString("en-IN")}.`;
                const link = whatsappLink(u.whatsappNumber ?? u.phone, msg);
                return (
                  <li key={i.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <span className="font-medium">{u.name}</span>{" "}
                      <span className="text-xs text-muted-foreground">{u.referralCode}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-semibold">{formatRupees(i.amount)}</span>
                      <span className="text-xs text-muted-foreground">
                        {i.dueDate.toLocaleDateString("en-IN")}
                      </span>
                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Remind
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={spage}
              pageSize={PAGE_SIZE}
              total={dueSoonTotal}
              basePath="/franchise/unpaid"
              pageParam="spage"
              params={others("spage")}
              variant="franchise"
            />
          </>
        )}
      </section>
    </div>
  );
}
