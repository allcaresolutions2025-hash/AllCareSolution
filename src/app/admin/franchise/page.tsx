import { prisma } from "@/lib/db";
import { Pagination } from "@/components/pagination";
import { GrantFranchiseCard, FranchiseRequestActions, RevokeFranchiseButton } from "./franchise-actions";
import { Store, Clock, Users } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Franchise — Admin" };

const PAGE_SIZE = 20;

function pageNum(v: string | undefined): number {
  return Math.max(1, parseInt(v ?? "1", 10) || 1);
}

export default async function AdminFranchisePage({
  searchParams,
}: {
  searchParams: { ppage?: string; apage?: string; rpage?: string };
}) {
  const ppage = pageNum(searchParams.ppage);
  const apage = pageNum(searchParams.apage);
  const rpage = pageNum(searchParams.rpage);

  const [pending, pendingTotal, franchises, franchisesTotal, reviewed, reviewedTotal] = await Promise.all([
    prisma.franchiseRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      skip: (ppage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: {
          select: { name: true, email: true, phone: true, referralCode: true, leftLegCount: true, rightLegCount: true },
        },
      },
    }),
    prisma.franchiseRequest.count({ where: { status: "PENDING" } }),
    prisma.user.findMany({
      where: { isFranchise: true },
      orderBy: { franchiseGrantedAt: "desc" },
      skip: (apage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, email: true, referralCode: true, phone: true,
        franchiseGrantedAt: true, leftLegCount: true, rightLegCount: true,
        _count: { select: { franchiseLoans: true, franchiseRewardClaims: true } },
      },
    }),
    prisma.user.count({ where: { isFranchise: true } }),
    prisma.franchiseRequest.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { reviewedAt: "desc" },
      skip: (rpage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, referralCode: true } } },
    }),
    prisma.franchiseRequest.count({ where: { status: { not: "PENDING" } } }),
  ]);

  // Carry the other tables' page numbers so paging one doesn't reset the rest.
  const others = (skip: "ppage" | "apage" | "rpage") => ({
    ppage: skip !== "ppage" && ppage > 1 ? String(ppage) : undefined,
    apage: skip !== "apage" && apage > 1 ? String(apage) : undefined,
    rpage: skip !== "rpage" && rpage > 1 ? String(rpage) : undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="h-6 w-6 text-franchise-600" /> Franchise
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A franchise leader vets their downline&apos;s loan requests before they reach you, and
          approves plus delivers their Welcome Kits. Everything they approve still needs your
          final sign-off.
        </p>
      </div>

      <GrantFranchiseCard />

      <section className="card overflow-hidden">
        <h2 className="font-semibold flex items-center gap-2 p-5 pb-4">
          <Clock className="h-4 w-4 text-amber-600" /> Pending requests ({pendingTotal})
        </h2>
        {pendingTotal === 0 ? (
          <p className="text-sm text-muted-foreground px-5 pb-5">No franchise requests waiting.</p>
        ) : (
          <>
          <div className="overflow-x-auto px-5">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 pr-3">Member</th>
                  <th className="text-left py-2 pr-3">Team</th>
                  <th className="text-left py-2 pr-3">Message</th>
                  <th className="text-left py-2 pr-3">Requested</th>
                  <th className="text-right py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-3 align-top">
                      <div className="font-medium">{r.user.name}</div>
                      <div className="text-xs text-muted-foreground">{r.user.referralCode}</div>
                      <div className="text-xs text-muted-foreground">{r.user.phone ?? r.user.email}</div>
                    </td>
                    <td className="py-3 pr-3 align-top text-xs tabular-nums">
                      L {r.user.leftLegCount} / R {r.user.rightLegCount}
                    </td>
                    <td className="py-3 pr-3 align-top text-xs text-muted-foreground max-w-[320px]">
                      {r.note || "—"}
                    </td>
                    <td className="py-3 pr-3 align-top text-xs text-muted-foreground">
                      {r.requestedAt.toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 align-top text-right">
                      <FranchiseRequestActions id={r.id} />
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
            basePath="/admin/franchise"
            pageParam="ppage"
            params={others("ppage")}
            variant="franchise"
          />
          </>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="font-semibold flex items-center gap-2 p-5 pb-4">
          <Users className="h-4 w-4 text-franchise-600" /> Active franchises ({franchisesTotal})
        </h2>
        {franchisesTotal === 0 ? (
          <p className="text-sm text-muted-foreground px-5 pb-5">No franchises yet.</p>
        ) : (
          <>
          <div className="overflow-x-auto px-5">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 pr-3">Franchise</th>
                  <th className="text-left py-2 pr-3">Team</th>
                  <th className="text-left py-2 pr-3">Handled</th>
                  <th className="text-left py-2 pr-3">Since</th>
                  <th className="text-right py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {franchises.map((f) => (
                  <tr key={f.id}>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{f.referralCode}</div>
                      <div className="text-xs text-muted-foreground">{f.phone ?? f.email}</div>
                    </td>
                    <td className="py-3 pr-3 text-xs tabular-nums">
                      L {f.leftLegCount} / R {f.rightLegCount}
                    </td>
                    <td className="py-3 pr-3 text-xs tabular-nums">
                      {f._count.franchiseLoans} loans · {f._count.franchiseRewardClaims} kits
                    </td>
                    <td className="py-3 pr-3 text-xs text-muted-foreground">
                      {f.franchiseGrantedAt ? f.franchiseGrantedAt.toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <RevokeFranchiseButton referralCode={f.referralCode} name={f.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={apage}
            pageSize={PAGE_SIZE}
            total={franchisesTotal}
            basePath="/admin/franchise"
            pageParam="apage"
            params={others("apage")}
            variant="franchise"
          />
          </>
        )}
      </section>

      {reviewedTotal > 0 && (
        <section className="card overflow-hidden">
          <h2 className="font-semibold p-5 pb-4">Reviewed requests ({reviewedTotal})</h2>
          <ul className="divide-y text-sm px-5">
            {reviewed.map((r) => (
              <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <span className="font-medium">{r.user.name}</span>{" "}
                  <span className="text-xs text-muted-foreground">{r.user.referralCode}</span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    r.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
          <Pagination
            page={rpage}
            pageSize={PAGE_SIZE}
            total={reviewedTotal}
            basePath="/admin/franchise"
            pageParam="rpage"
            params={others("rpage")}
            variant="franchise"
          />
        </section>
      )}
    </div>
  );
}
