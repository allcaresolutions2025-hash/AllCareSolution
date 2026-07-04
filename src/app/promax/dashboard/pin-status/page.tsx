import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ListChecks } from "lucide-react";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Pin Status" };

const PAGE_SIZE = 20;

export default async function ProMaxPinStatusPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const [total, pins] = await Promise.all([
    prisma.pin.count({ where: { ownerId: session.user.id, proMax: true } }),
    prisma.pin.findMany({
      where: { ownerId: session.user.id, proMax: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        code: true,
        status: true,
        createdAt: true,
        usedAt: true,
        usedForUser: { select: { name: true, referralCode: true } },
      },
    }),
  ]);

  const active = pins.filter((p) => p.status === "ACTIVE").length;
  const used = pins.filter((p) => p.status === "USED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-promax-600" /> Pro Max Pin Status
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every Pro Max pin you own and what it was used for.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-2xl font-bold tabular-nums text-promax-700">{active}</div>
          <div className="text-xs text-muted-foreground">Active (ready to use)</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-bold tabular-nums">{used}</div>
          <div className="text-xs text-muted-foreground">Used</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {pins.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No Pro Max pins yet. Request pins to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Pin code</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Used for</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {pins.map((p) => (
                <tr key={p.code} className="border-t">
                  <td className="px-4 py-2 font-mono">{p.code}</td>
                  <td className="px-4 py-2">
                    {p.status === "ACTIVE" ? (
                      <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-promax-100 text-promax-700">Active</span>
                    ) : (
                      <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{p.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {p.usedForUser ? (
                      <span>
                        {p.usedForUser.name}{" "}
                        <code className="font-mono text-xs text-muted-foreground">{p.usedForUser.referralCode}</code>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {(p.usedAt ?? p.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/promax/dashboard/pin-status" />
        )}
      </div>
    </div>
  );
}
