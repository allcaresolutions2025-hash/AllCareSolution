import { prisma } from "@/lib/db";
import { ProMaxRequestRow } from "./promax-request-row";
import { KeyRound } from "lucide-react";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Pin Requests" };

const PAGE_SIZE = 20;

export default async function ProMaxAdminPinRequestsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const [pendingTotal, pending, recent] = await Promise.all([
    prisma.pinRequest.count({ where: { proMax: true, status: "PENDING" } }),
    prisma.pinRequest.findMany({
      where: { proMax: true, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, referralCode: true } } },
    }),
    prisma.pinRequest.findMany({
      where: { proMax: true, status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { reviewedAt: "desc" },
      take: 30,
      include: { user: { select: { name: true, referralCode: true } }, _count: { select: { pins: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-promax-600" /> Pro Max Pin Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Approve to mint Pro Max pins for the member; reject to decline.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Pending ({pendingTotal})</h2>
        </div>
        {pending.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No pending requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Requested</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium">Mobile</th>
                  <th className="px-4 py-2 font-medium text-right">Qty</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <ProMaxRequestRow
                    key={r.id}
                    id={r.id}
                    createdAt={r.createdAt.toISOString()}
                    userName={r.user.name}
                    userCode={r.user.referralCode}
                    mobile={r.mobileNumber}
                    quantity={r.quantity}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pendingTotal > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={pendingTotal} basePath="/promax-admin/pin-requests" />
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Recent history</h2>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No history yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Reviewed</th>
                  <th className="px-4 py-2 font-medium">Member</th>
                  <th className="px-4 py-2 font-medium text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-right">Issued</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {r.reviewedAt?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.user.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{r.user.referralCode}</div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.quantity}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r._count.pins}</td>
                    <td className="px-4 py-2">
                      {r.status === "APPROVED" ? (
                        <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Approved</span>
                      ) : (
                        <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
