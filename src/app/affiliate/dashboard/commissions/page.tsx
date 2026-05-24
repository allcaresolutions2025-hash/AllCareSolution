import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const commissions = await prisma.commission.findMany({
    where: { beneficiaryId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { orderNumber: true, deliveredAt: true, buybackUntil: true } },
    },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">All Commissions</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Commissions move from <span className="badge-amber">PENDING</span> → <span className="badge-green">AVAILABLE</span> after
        the 30-day buyback window closes. Available commissions can be withdrawn from the Payouts page.
      </p>
      {commissions.length === 0 ? (
        <div className="card p-10 text-center text-muted-foreground">
          No commissions yet.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Level / Rate</th>
                <th className="px-4 py-2 font-medium text-right">Base</th>
                <th className="px-4 py-2 font-medium text-right">Commission</th>
                <th className="px-4 py-2 font-medium">Available on</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{c.order.orderNumber}</td>
                  <td className="px-4 py-2">L{c.level} · {c.ratePercent}%</td>
                  <td className="px-4 py-2 text-right">{formatINR(c.baseAmount)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{formatINR(c.commissionAmount)}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {c.order.buybackUntil
                      ? new Date(c.order.buybackUntil).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
                      : c.availableAt
                        ? new Date(c.availableAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
                        : "After delivery + 30 days"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={
                      c.status === "PENDING" ? "badge-amber" :
                      c.status === "AVAILABLE" ? "badge-green" :
                      c.status === "PAID" ? "badge-blue" :
                      c.status === "REVERSED" ? "badge-red" : "badge-gray"
                    }>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
