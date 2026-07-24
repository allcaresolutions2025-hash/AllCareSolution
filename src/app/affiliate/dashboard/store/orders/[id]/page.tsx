import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { CheckCircle2, Circle, Package, Truck, Home, BadgeCheck, Wallet, Banknote, ArrowLeft } from "lucide-react";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STEPS: { key: OrderStatus | "PLACED"; label: string; icon: React.ReactNode }[] = [
  { key: "PLACED", label: "Order Placed", icon: <BadgeCheck className="h-5 w-5" /> },
  { key: "PAID", label: "Processing", icon: <Package className="h-5 w-5" /> },
  { key: "SHIPPED", label: "Shipped", icon: <Truck className="h-5 w-5" /> },
  { key: "DELIVERED", label: "Delivered", icon: <Home className="h-5 w-5" /> },
];

function stepIndex(status: OrderStatus): number {
  if (status === "PENDING_PAYMENT") return 0;
  if (status === "PAID") return 1;
  if (status === "SHIPPED") return 2;
  if (status === "DELIVERED") return 3;
  return -1; // CANCELLED / RETURNED / REFUNDED
}

export default async function StoreOrderDetailPage({
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

  const currentStep = stepIndex(order.status);
  const isCancelled = ["CANCELLED", "RETURNED", "REFUNDED"].includes(order.status);
  const paidByPoints = order.paymentMethod === "WALLET_POINTS";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link href="/affiliate/dashboard/store/orders" className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to my orders
      </Link>

      {/* Success banner */}
      {searchParams.ok === "1" && (
        <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-emerald-50 p-5 flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-100 grid place-items-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-brand-700" />
          </div>
          <div>
            <p className="font-bold text-brand-900">Order placed successfully!</p>
            <p className="text-sm text-brand-700 mt-0.5">
              {paidByPoints
                ? "Paid from your payout wallet. Admin will process and dispatch it — track progress below."
                : "Your COD order is confirmed. Admin will process and dispatch it — track progress below."}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Placed on {new Date(order.placedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
          isCancelled ? "bg-red-100 text-red-700" :
          order.status === "DELIVERED" ? "bg-emerald-100 text-emerald-700" :
          order.status === "SHIPPED" ? "bg-sky-100 text-sky-700" :
          "bg-amber-100 text-amber-700"
        }`}>
          {order.status.replace("_", " ")}
        </span>
      </div>

      {/* Step tracker */}
      {!isCancelled && (
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-5">Order Progress</h2>
          <div className="relative">
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-100" style={{ zIndex: 0 }}>
              <div
                className="h-full bg-brand-500 transition-all duration-500"
                style={{ width: currentStep <= 0 ? "0%" : currentStep === 1 ? "33%" : currentStep === 2 ? "66%" : "100%" }}
              />
            </div>
            <div className="relative flex justify-between" style={{ zIndex: 1 }}>
              {STEPS.map((step, idx) => {
                const done = idx <= currentStep;
                const active = idx === currentStep;
                return (
                  <div key={step.key} className="flex flex-col items-center text-center w-1/4">
                    <div className={`h-10 w-10 rounded-full grid place-items-center border-2 transition-all ${
                      done ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-300" : "bg-white border-slate-200 text-slate-300"
                    } ${active ? "ring-4 ring-brand-200" : ""}`}>
                      {done ? (idx < currentStep ? <CheckCircle2 className="h-5 w-5" /> : step.icon) : <Circle className="h-5 w-5" />}
                    </div>
                    <p className={`mt-2 text-xs font-semibold ${done ? "text-brand-700" : "text-slate-400"}`}>{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {order.trackingNumber && (
            <div className="mt-5 pt-4 border-t flex items-center gap-3 flex-wrap">
              <Truck className="h-4 w-4 text-sky-600 shrink-0" />
              <div className="text-sm">
                <span className="font-medium">{order.courier || "Courier"}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{order.trackingNumber}</span>
              </div>
            </div>
          )}

          <div className={`mt-4 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${paidByPoints ? "text-brand-700 bg-brand-50" : "text-emerald-700 bg-emerald-50"}`}>
            {paidByPoints ? <Wallet className="h-3.5 w-3.5 shrink-0" /> : <Banknote className="h-3.5 w-3.5 shrink-0" />}
            {paidByPoints ? "Paid from your payout wallet points" : "Cash on Delivery — pay when your order arrives"}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="card p-5 border-red-200 bg-red-50/50 text-center">
          <p className="font-semibold text-red-700">This order has been {order.status.toLowerCase()}.</p>
          <p className="text-sm text-red-600 mt-1">Contact support if you have any questions.</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {/* Items */}
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

          {order.buybackUntil && (
            <div className="card p-5 bg-brand-50 border-brand-200">
              <h2 className="font-semibold text-brand-900">30-day buyback</h2>
              <p className="text-sm text-brand-800 mt-1">
                Eligible for return until {new Date(order.buybackUntil).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.
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
