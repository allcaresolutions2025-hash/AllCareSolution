"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { OrderStatus } from "@prisma/client";

export function OrderActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [tracking, setTracking] = useState("");
  const [courier, setCourier] = useState("");
  const [loading, setLoading] = useState(false);

  async function call(action: string, payload?: Record<string, unknown>) {
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${orderId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed");
      return;
    }
    toast.success("Updated");
    router.refresh();
  }

  return (
    <div className="card p-5 space-y-3">
      <h2 className="font-semibold">Actions</h2>
      <div className="flex flex-wrap gap-2 items-center">
        {status === "PAID" && (
          <>
            <input
              className="input max-w-[200px]"
              placeholder="Tracking number"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
            <input
              className="input max-w-[150px]"
              placeholder="Courier"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
            />
            <button
              disabled={loading || !tracking}
              onClick={() => call("ship", { trackingNumber: tracking, courier })}
              className="btn-primary"
            >
              Mark shipped
            </button>
          </>
        )}
        {status === "SHIPPED" && (
          <button disabled={loading} onClick={() => call("deliver")} className="btn-primary">
            Mark delivered (starts 30-day buyback)
          </button>
        )}
        {(status === "PAID" || status === "SHIPPED" || status === "DELIVERED") && (
          <button
            disabled={loading}
            onClick={() => {
              if (confirm("Mark as returned and reverse commissions?")) {
                call("return");
              }
            }}
            className="btn-outline border-red-200 text-red-700 hover:bg-red-50"
          >
            Mark returned & reverse commissions
          </button>
        )}
        {(status === "PENDING_PAYMENT" || status === "PAID") && (
          <button
            disabled={loading}
            onClick={() => {
              if (confirm("Cancel this order?")) call("cancel");
            }}
            className="btn-outline border-amber-200 text-amber-800 hover:bg-amber-50"
          >
            Cancel order
          </button>
        )}
      </div>
    </div>
  );
}
