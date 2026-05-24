import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { name: true, quantity: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <div className="card p-10 text-center">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Link href="/products" className="btn-primary mt-4 inline-flex">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="card p-4 flex justify-between items-center gap-4 hover:shadow transition"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{o.orderNumber}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Placed {new Date(o.placedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                </p>
              </div>
              <div className="text-right">
                <div className="font-bold">{formatINR(o.totalAmount)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
