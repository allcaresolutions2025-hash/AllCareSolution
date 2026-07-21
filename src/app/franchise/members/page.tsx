import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFranchiseMembers, whatsappLink } from "@/lib/franchise";
import { formatRupees } from "@/lib/loan";
import { Pagination } from "@/components/pagination";
import { FranchiseSearchForm, SearchSummary } from "../search-form";
import { Users, MessageCircle, Store } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Members — Franchise" };

const PAGE_SIZE = 20;

export default async function FranchiseMembersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const { members, total } = await getFranchiseMembers(session.user.id, {
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    q,
  });
  const ids = members.map((m) => m.id);

  // One grouped query for open loan exposure per member, rather than N queries.
  const loanTotals = ids.length
    ? await prisma.loan.groupBy({
        by: ["userId"],
        where: { userId: { in: ids }, status: "APPROVED", proMax: false },
        _sum: { amount: true },
        _count: { _all: true },
      })
    : [];
  const byUser = new Map(loanTotals.map((l) => [l.userId, l]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-franchise-600" /> My Members
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everyone in your downline you are responsible for. Members under a nested franchise
          are managed by that franchise instead.
        </p>
      </div>

      <FranchiseSearchForm basePath="/franchise/members" q={q} />
      <SearchSummary q={q} total={total} noun="member" />

      <section className="card overflow-hidden">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground p-5">
            {q ? "No members match this search." : "No members under you yet."}
          </p>
        ) : (
          <>
          <div className="overflow-x-auto p-5 pb-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 pr-3">Member</th>
                  <th className="text-left py-2 pr-3">Team</th>
                  <th className="text-left py-2 pr-3">Active loans</th>
                  <th className="text-left py-2 pr-3">Joined</th>
                  <th className="text-right py-2">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((m) => {
                  const loans = byUser.get(m.id);
                  const link = whatsappLink(
                    m.whatsappNumber ?? m.phone,
                    `Hello ${m.name}, this is your ACHT MART franchise. `,
                  );
                  return (
                    <tr key={m.id}>
                      <td className="py-3 pr-3">
                        <div className="font-medium flex items-center gap-1.5">
                          {m.name}
                          {m.isFranchise && (
                            <span title="Franchise leader">
                              <Store className="h-3.5 w-3.5 text-franchise-600" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{m.referralCode}</div>
                      </td>
                      <td className="py-3 pr-3 text-xs tabular-nums">
                        L {m.leftLegCount} / R {m.rightLegCount}
                      </td>
                      <td className="py-3 pr-3 text-xs tabular-nums">
                        {loans?._count._all
                          ? `${loans._count._all} · ${formatRupees(loans._sum.amount ?? 0)}`
                          : "—"}
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        {m.createdAt.toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3 text-right">
                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
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
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/franchise/members"
            params={{ q: q || undefined }}
            variant="franchise"
          />
          </>
        )}
      </section>
    </div>
  );
}
