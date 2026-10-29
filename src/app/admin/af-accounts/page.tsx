import Link from "next/link";
import { prisma } from "@/lib/db";
import { Search, Users } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { AfAccountRow } from "./af-account-row";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "AF Accounts" };

const PAGE_SIZE = 20;

export default async function AdminAfAccountsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where: Prisma.UserWhereInput = {
    isAf: true,
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
        afSlot: true,
        afReferrer: { select: { referralCode: true } },
        packageAccount: { select: { packageTotal: true, walletBalance: true } },
        wallet: { select: { balanceAvailable: true } },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Users className="h-6 w-6 text-af-600" />
          AF Accounts
        </h1>
        <p className="text-sm text-muted-foreground">
          All AF Solution accounts. Use <strong>Add points</strong> to credit an account&apos;s AF wallet. The account
          sees it in its AF earnings and can move it to the e-wallet to withdraw. · <strong>{total}</strong> account
          {total === 1 ? "" : "s"}
          {q ? " match" : ""}
        </p>
      </div>

      <form className="card p-4 mb-4 flex flex-wrap items-center gap-2" action="" method="get">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input name="q" defaultValue={q} placeholder="Search by name, mobile or AF ID…" className="input flex-1 min-w-[200px]" />
        <button type="submit" className="btn-primary">
          Search
        </button>
        {q && (
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
                  }}
                />
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No AF accounts{q ? " match this search" : " yet"}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/af-accounts" params={{ q: q || undefined }} />
      </div>
    </div>
  );
}
