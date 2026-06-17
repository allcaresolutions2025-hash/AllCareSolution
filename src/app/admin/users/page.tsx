import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPoints } from "@/lib/money";
import { Download, ChevronRight, Search, Pencil } from "lucide-react";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
          { referralCode: { contains: q.toUpperCase() } },
          { panNumber: { contains: q.toUpperCase() } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        wallet: true,
        _count: {
          select: {
            referrals: true,
            orders: { where: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } } },
          },
        },
        referrer: { select: { name: true, email: true } },
      },
    }),
  ]);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-2xl font-bold">Users{q ? ` — "${q}"` : ""} ({total})</h1>
        <a
          href="/api/admin/users/export"
          className="btn-outline inline-flex items-center gap-2 shrink-0"
          download
        >
          <Download className="h-4 w-4" /> Download Excel
        </a>
      </div>

      <form className="card p-4 mb-4 flex items-center gap-2" action="" method="get">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, phone, AM ID, or PAN…"
          className="input flex-1"
        />
        <button type="submit" className="btn-primary">Search</button>
        {q && (
          <Link href="/admin/users" className="btn-outline">Clear</Link>
        )}
      </form>
      <div className="card">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Ref code</th>
              <th className="px-4 py-2 font-medium">Referred by</th>
              <th className="px-4 py-2 font-medium text-right">Direct refs</th>
              <th className="px-4 py-2 font-medium text-right">Orders</th>
              <th className="px-4 py-2 font-medium text-right">Points (Avail)</th>
              <th className="px-4 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/40 transition-colors">
                <td className="px-4 py-2 font-medium">
                  <Link href={`/admin/network/${u.id}`} className="hover:underline text-brand-700 inline-flex items-center gap-1">
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-xs">{u.email}</td>
                <td className="px-4 py-2 text-xs">{u.phone || "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{u.referralCode}</td>
                <td className="px-4 py-2 text-xs">{u.referrer ? u.referrer.email : "—"}</td>
                <td className="px-4 py-2 text-right">{u._count.referrals}</td>
                <td className="px-4 py-2 text-right">{u._count.orders}</td>
                <td className="px-4 py-2 text-right font-medium text-brand-700">{formatPoints(u.wallet?.balanceAvailable ?? 0)}</td>
                <td className="px-4 py-2">
                  {u.role === "ADMIN" ? <span className="badge-blue">Admin</span> : <span className="badge-gray">Customer</span>}
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Link href={`/admin/users/${u.id}/edit`} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    <Link href={`/admin/network/${u.id}`} className="text-muted-foreground hover:text-foreground inline-flex items-center text-xs gap-1">
                      Tree <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/users"
          params={{ q }}
        />
      </div>
    </div>
  );
}
