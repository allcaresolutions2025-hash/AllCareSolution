import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProMaxImpersonateButton } from "./impersonate-button";
import { Search, ShieldAlert, LogIn } from "lucide-react";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function ProMaxImpersonatePage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  // Only Pro Max members are impersonable from this portal.
  const where = {
    isProMax: true,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
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
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, phone: true, referralCode: true, isActive: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><LogIn className="h-6 w-6 text-promax-600" /> Login as User</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in as any Pro Max member to see their portal exactly as they do. A banner stays visible while
          impersonating, and one click returns you to the Pro Max admin account.
        </p>
      </div>

      <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2 mb-4">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
        <div><strong>Heads-up:</strong> any action you take while impersonating is performed as that member.</div>
      </div>

      <form className="card p-4 mb-4 flex items-center gap-2" action="" method="get">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input name="q" defaultValue={q} placeholder="Search by name, email, phone, or AM ID…" className="input flex-1" />
        <button type="submit" className="inline-flex items-center px-4 py-2 rounded-md bg-promax-700 text-white text-sm font-semibold hover:bg-promax-800">Search</button>
        {q && <Link href="/promax-admin/impersonate" className="inline-flex items-center px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted">Clear</Link>}
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Member ID</th>
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
                  <td className="px-4 py-2 text-xs">{u.isActive ? <span className="text-emerald-700">Active</span> : <span className="text-red-600">Inactive</span>}</td>
                  <td className="px-4 py-2 text-right">
                    <ProMaxImpersonateButton userId={u.id} userName={u.name} disabled={!u.isActive} />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">{q ? `No Pro Max members match "${q}".` : "No Pro Max members yet."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {total > PAGE_SIZE && (
          <Pagination page={page} pageParam="page" pageSize={PAGE_SIZE} total={total} basePath="/promax-admin/impersonate" params={{ q: q || undefined }} />
        )}
      </div>
    </div>
  );
}
