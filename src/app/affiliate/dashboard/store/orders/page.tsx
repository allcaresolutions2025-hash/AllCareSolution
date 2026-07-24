import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { ShoppingBag, Wallet, Banknote } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StoreOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { name: true, quantity: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <Link href="/affiliate/dashboard/store" className="btn-primary inline-flex">Continue shopping</Link>
      </div>

      {orders.length === 0 ? (
        <div className="card p-10 text-center">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">You haven&apos;t placed any orders yet.</p>
          <Link href="/affiliate/dashboard/store" className="btn-primary mt-4 inline-flex">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/affiliate/dashboard/store/orders/${o.id}`}
              className="card p-4 flex justify-between items-center gap-4 hover:shadow transition"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm">{o.orderNumber}</span>
                  <OrderStatusBadge status={o.status} />
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    {o.paymentMethod === "WALLET_POINTS"
                      ? <><Wallet className="h-3 w-3" /> Points</>
                      : <><Banknote className="h-3 w-3" /> COD</>}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Placed {new Date(o.placedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold">{formatINR(o.totalAmount)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
