import { prisma } from "@/lib/db";
import { GenerateProMaxPinsCard } from "./generate-promax-pins-card";
import { KeyRound } from "lucide-react";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Generate Pro Max Pins" };

const PAGE_SIZE = 20;

export default async function ProMaxAdminPinsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const [total, recent] = await Promise.all([
    prisma.pin.count({ where: { proMax: true } }),
    prisma.pin.findMany({
      where: { proMax: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        code: true,
        status: true,
        createdAt: true,
        owner: { select: { name: true, referralCode: true } },
        usedForUser: { select: { name: true, referralCode: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-promax-600" /> Generate Pro Max Pins
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mint pins for onboarding. For pins members request themselves, use the Pin Requests queue.
        </p>
      </div>

      <GenerateProMaxPinsCard />

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Recent Pro Max pins</h2>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No Pro Max pins yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Pin</th>
                  <th className="px-4 py-2 font-medium">Owner</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Used for</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.code} className="border-t">
                    <td className="px-4 py-2 font-mono">{p.code}</td>
                    <td className="px-4 py-2">
                      <div>{p.owner.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{p.owner.referralCode}</div>
                    </td>
                    <td className="px-4 py-2">
                      {p.status === "ACTIVE" ? (
                        <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-promax-100 text-promax-700">Active</span>
                      ) : (
                        <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{p.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {p.usedForUser ? (
                        <span>{p.usedForUser.name} <code className="font-mono text-xs text-muted-foreground">{p.usedForUser.referralCode}</code></span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {p.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/promax-admin/pins" />
        )}
      </div>
    </div>
  );
}
