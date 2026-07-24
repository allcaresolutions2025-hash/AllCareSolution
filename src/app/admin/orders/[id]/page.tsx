import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { OrderActions } from "./order-actions";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: true,
      commissions: { include: { beneficiary: { select: { name: true, email: true } } } },
      l1Referrer: { select: { name: true, email: true } },
      l2Referrer: { select: { name: true, email: true } },
    },
  });
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">Placed {new Date(order.placedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
      </div>

      <OrderActions orderId={order.id} status={order.status} />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5 md:col-span-2 space-y-3">
          <h2 className="font-semibold">Items</h2>
          {order.items.map((it) => (
            <div key={it.id} className="flex justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-xs text-muted-foreground">SKU {it.sku} · GST {it.gstRate}%</div>
              </div>
              <div className="text-right">
                <div>{formatINR(it.unitPrice)} × {it.quantity}</div>
                <div className="text-xs text-muted-foreground">{formatINR(it.lineTotal + it.gstTotal)}</div>
              </div>
            </div>
          ))}
          <div className="border-t pt-3 space-y-1 text-sm">
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
            <h2 className="font-semibold">Customer</h2>
            <p className="text-sm mt-2">
              <strong>{order.user.name}</strong><br />
              {order.user.email}<br />
              {order.user.phone || "—"}
            </p>
          </div>
          <div className="card p-5">
            <h2 className="font-semibold">Shipping</h2>
            <p className="text-sm mt-2 text-muted-foreground">
              <strong className="text-foreground">{order.shipName}</strong><br />
              {order.shipLine1}{order.shipLine2 && `, ${order.shipLine2}`}<br />
              {order.shipCity}, {order.shipState} {order.shipPincode}<br />
              📞 {order.shipPhone}
            </p>
          </div>
          <div className="card p-5">
            <h2 className="font-semibold">Payment</h2>
            <div className="mt-2 text-sm">
              {order.razorpayOrderId ? (
                <p className="font-mono text-xs break-all text-muted-foreground">
                  Razorpay: {order.razorpayOrderId}<br />
                  Payment ID: {order.razorpayPaymentId || "—"}
                </p>
              ) : order.paymentMethod === "WALLET_POINTS" ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-brand-700 bg-brand-100 px-3 py-1 rounded-full text-xs">
                  Paid via payout wallet points
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full text-xs">
                  Cash on Delivery
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Commissions accrued from this order</h2>
        {order.commissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No commissions (this order had no referral chain).</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="font-medium pb-2">Beneficiary</th>
                <th className="font-medium pb-2">Level</th>
                <th className="font-medium pb-2 text-right">Amount</th>
                <th className="font-medium pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {order.commissions.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-2">{c.beneficiary.name} <span className="text-xs text-muted-foreground">({c.beneficiary.email})</span></td>
                  <td className="py-2">L{c.level} · {c.ratePercent}%</td>
                  <td className="py-2 text-right font-medium">{formatINR(c.commissionAmount)}</td>
                  <td className="py-2">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 text-xs text-muted-foreground">
          L1 referrer: {order.l1Referrer?.name || "—"}{order.l1Referrer && ` (${order.l1Referrer.email})`}<br />
          L2 referrer: {order.l2Referrer?.name || "—"}{order.l2Referrer && ` (${order.l2Referrer.email})`}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}
