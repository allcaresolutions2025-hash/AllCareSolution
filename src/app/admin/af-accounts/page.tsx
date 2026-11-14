import Link from "next/link";
import { prisma } from "@/lib/db";
import { Search, Users } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { daysBetween } from "@/lib/af";
import { AfAccountRow } from "./af-account-row";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "AF Accounts" };

const PAGE_SIZE = 20;

export default async function AdminAfAccountsPage({ searchParams }: { searchParams: { q?: string; page?: string; status?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const status = searchParams.status === "active" || searchParams.status === "removed" ? searchParams.status : "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where: Prisma.UserWhereInput = {
    isAf: true,
    ...(status ? { isActive: status === "active" } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { referralCode: { contains: q.toUpperCase() } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        referralCode: true,
        createdAt: true,
        isActive: true,
        afSlot: true,
        afReferrer: { select: { referralCode: true } },
        packageAccount: { select: { packageTotal: true, walletBalance: true } },
        wallet: { select: { balanceAvailable: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  // Days active: from the day the AF ID was created until today, or until the
  // admin removed access (latest AF_ACCESS_REMOVED audit entry).
  const ids = users.map((u) => u.id);
  const removedIds = users.filter((u) => !u.isActive).map((u) => u.id);
  const [firstPackages, removals] = await Promise.all([
    ids.length
      ? prisma.packagePurchase.groupBy({
          by: ["userId"],
          where: { userId: { in: ids }, status: "APPROVED" },
          _min: { reviewedAt: true },
        })
      : [],
    removedIds.length
      ? prisma.auditLog.findMany({
          where: { action: "AF_ACCESS_REMOVED", target: { in: removedIds } },
          orderBy: { createdAt: "desc" },
          select: { target: true, createdAt: true },
        })
      : [],
  ]);
  const firstPackageAt = new Map(firstPackages.map((p) => [p.userId, p._min.reviewedAt]));
  const removedAt = new Map<string, Date>();
  for (const r of removals) if (r.target && !removedAt.has(r.target)) removedAt.set(r.target, r.createdAt);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Users className="h-6 w-6 text-af-600" />
          AF Accounts
        </h1>
        <p className="text-sm text-muted-foreground">
          All AF Solution accounts. Use <strong>Add points</strong> to credit an account&apos;s AF wallet. The account
          sees it in its AF earnings and can move it to the e-wallet to withdraw. <strong>Active days</strong> counts from the
          day the AF ID was created; use <strong>Remove access</strong> to block an account from the AF portal (it can be
          restored later). · <strong>{total}</strong> account
          {total === 1 ? "" : "s"}
          {q ? " match" : ""}
        </p>
      </div>

      <form className="card p-4 mb-4 flex flex-wrap items-center gap-2" action="" method="get">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input name="q" defaultValue={q} placeholder="Search by name, mobile or AF ID…" className="input flex-1 min-w-[200px]" />
        <select name="status" defaultValue={status} className="input w-auto">
          <option value="">All accounts</option>
          <option value="active">Active</option>
          <option value="removed">Access removed</option>
        </select>
        <button type="submit" className="btn-primary">
          Search
        </button>
        {(q || status) && (
          <Link href="/admin/af-accounts" className="btn-outline">
            Clear
          </Link>
        )}
      </form>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">AF account</th>
                <th className="px-4 py-2 font-medium">Placed under</th>
                <th className="px-4 py-2 font-medium">Active days</th>
                <th className="px-4 py-2 font-medium">Packages</th>
                <th className="px-4 py-2 font-medium">AF wallet</th>
                <th className="px-4 py-2 font-medium">E-wallet</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <AfAccountRow
                  key={u.id}
                  row={{
                    id: u.id,
                    afId: u.referralCode,
                    name: u.name,
                    phone: u.phone,
                    placement: u.afReferrer
                      ? `${u.afReferrer.referralCode}${u.afSlot ? ` · ${u.afSlot.toLowerCase()}` : ""}`
                      : null,
                    packageTotal: u.packageAccount?.packageTotal ?? 0,
                    afWallet: u.packageAccount?.walletBalance ?? 0,
                    eWallet: u.wallet?.balanceAvailable ?? 0,
                    createdAt: u.createdAt.toISOString(),
                    isActive: u.isActive,
                    removedAt: removedAt.get(u.id)?.toISOString() ?? null,
                    daysActive: u.isActive
                      ? daysBetween(u.createdAt)
                      : removedAt.has(u.id)
                        ? daysBetween(u.createdAt, removedAt.get(u.id))
                        : null,
                    firstPackageAt: firstPackageAt.get(u.id)?.toISOString() ?? null,
                  }}
                />
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No AF accounts{q ? " match this search" : " yet"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/af-accounts" params={{ q: q || undefined, status: status || undefined }} />
      </div>
    </div>
  );
}
