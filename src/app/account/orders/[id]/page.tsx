import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { ok?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!order || order.userId !== session.user.id) notFound();

  return (
    <div>
      {searchParams.ok === "1" && (
        <div className="card border-brand-200 bg-brand-50 p-4 mb-6 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-brand-700 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-brand-900">Order placed successfully!</p>
            <p className="text-sm text-brand-800">
              Your order is now with our admin team. The delivery date will be updated here shortly —
              you can track this order on the same page.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Placed on {new Date(order.placedAt).toLocaleString("en-IN")}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5 md:col-span-2 space-y-4">
          <h2 className="font-semibold">Items</h2>
          <div className="space-y-3">
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between text-sm">
                <div>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-muted-foreground">SKU {it.sku} · GST {it.gstRate}%</div>
                </div>
                <div className="text-right">
                  <div>{formatINR(it.unitPrice)} × {it.quantity}</div>
                  <div className="text-muted-foreground text-xs">Subtotal {formatINR(it.lineTotal + it.gstTotal)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-1 text-sm">
            <Row label="Subtotal (pre-GST)" value={formatINR(order.subtotal)} />
            <Row label="GST" value={formatINR(order.gstAmount)} />
            <Row label="Shipping" value={order.shippingCost > 0 ? formatINR(order.shippingCost) : "Free"} />
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span>
              <span>{formatINR(order.totalAmount)}</span>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold">Shipping address</h2>
            <div className="mt-2 text-sm text-muted-foreground">
              <div className="text-foreground font-medium">{order.shipName}</div>
              <div>{order.shipLine1}</div>
              {order.shipLine2 && <div>{order.shipLine2}</div>}
              <div>{order.shipCity}, {order.shipState} {order.shipPincode}</div>
              <div className="mt-1">📞 {order.shipPhone}</div>
            </div>
          </div>
          {order.trackingNumber && (
            <div className="card p-5">
              <h2 className="font-semibold">Tracking</h2>
              <p className="text-sm mt-2">{order.courier}</p>
              <p className="text-xs font-mono mt-1">{order.trackingNumber}</p>
            </div>
          )}
          {order.buybackUntil && (
            <div className="card p-5 bg-brand-50 border-brand-200">
              <h2 className="font-semibold text-brand-900">30-day buyback</h2>
              <p className="text-sm text-brand-800 mt-1">
                Eligible for return until {new Date(order.buybackUntil).toLocaleDateString("en-IN")}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
