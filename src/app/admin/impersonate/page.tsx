import Link from "next/link";
import { prisma } from "@/lib/db";
import { ImpersonateButton } from "./impersonate-button";
import { Search, ShieldAlert } from "lucide-react";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminImpersonatePage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
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
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        referralCode: true,
        role: true,
        isActive: true,
      },
    }),
  ]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Login as User</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in as any member to see their dashboard exactly as they do — useful for support and debugging.
          A banner stays visible while you are impersonating, and one click returns you to the admin account.
        </p>
      </div>

      <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2 mb-4">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <strong>Heads-up:</strong> any action you take while impersonating is performed as that user.
          Avoid clicking buttons that change state (placing orders, requesting payouts, etc.) unless that is what you intend.
        </div>
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
          <Link href="/admin/impersonate" className="btn-outline">Clear</Link>
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
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2 font-medium">{u.name}</td>
                <td className="px-4 py-2 text-xs">{u.email}</td>
                <td className="px-4 py-2 text-xs">{u.phone || "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{u.referralCode}</td>
                <td className="px-4 py-2">
                  {u.role === "ADMIN" ? <span className="badge-blue">Admin</span> : <span className="badge-gray">Customer</span>}
                </td>
                <td className="px-4 py-2 text-xs">
                  {u.isActive ? (
                    <span className="text-emerald-700">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <ImpersonateButton userId={u.id} userName={u.name} disabled={!u.isActive} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  {q ? `No users match "${q}".` : "No users found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/impersonate"
          params={{ q }}
        />
      </div>
    </div>
  );
}
