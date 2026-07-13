import { prisma } from "@/lib/db";
import { PinRewardRow } from "./pin-reward-row";
import { Pagination } from "@/components/pagination";
import { Gift } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminPinRewardsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const [total, pendingAgg, requests] = await Promise.all([
    prisma.pinReward.count(),
    prisma.pinReward.aggregate({
      where: { status: "PENDING" },
      _sum: { pointsValue: true },
    }),
    prisma.pinReward.findMany({
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      include: { user: { select: { name: true, email: true, phone: true, referralCode: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPendingPoints = pendingAgg._sum.pointsValue ?? 0;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Gift className="h-6 w-6 text-violet-600" /> Pin rewards ({total})
        </h1>
        <p className="text-sm text-muted-foreground">
          Members who obtained a 2,000-pt pin claim a reward here. Approving credits the points to their
          payout wallet. Pending total:{" "}
          <strong>{totalPendingPoints.toLocaleString("en-IN")} pts</strong>
        </p>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2 font-medium">Requested</th>
                <th className="px-4 py-2 font-medium text-right">Reward</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <PinRewardRow
                  key={r.id}
                  id={r.id}
                  user={r.user}
                  requestedAt={r.requestedAt.toISOString()}
                  pointsValue={r.pointsValue}
                  status={r.status}
                  adminNote={r.adminNote}
                />
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No pin reward requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/pin-rewards" />
      </div>
    </div>
  );
}
