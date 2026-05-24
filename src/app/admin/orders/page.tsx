import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge } from "@/components/order-status-badge";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const statusFilter = searchParams.status;
  const orders = await prisma.order.findMany({
    where: statusFilter && statusFilter !== "ALL"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? { status: statusFilter as any }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
    take: 200,
  });

  const tabs = ["ALL", "PENDING_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <Link
            key={t}
            href={t === "ALL" ? "/admin/orders" : `/admin/orders?status=${t}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border ${(statusFilter || "ALL") === t ? "bg-brand-600 text-white border-brand-600" : "bg-white hover:bg-muted"}`}
          >
            {t.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Order #</th>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium text-right">Total</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-2 font-mono text-xs">{o.orderNumber}</td>
                <td className="px-4 py-2">
                  <div className="font-medium">{o.user.name}</div>
                  <div className="text-xs text-muted-foreground">{o.user.email}</div>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(o.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                </td>
                <td className="px-4 py-2 text-right font-medium">{formatINR(o.totalAmount)}</td>
                <td className="px-4 py-2"><OrderStatusBadge status={o.status} /></td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/orders/${o.id}`} className="text-brand-700 hover:underline">View</Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No orders.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
