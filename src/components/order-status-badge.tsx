import type { OrderStatus } from "@prisma/client";

const map: Record<OrderStatus, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: "Pending Payment", className: "badge-amber" },
  PAID: { label: "Confirmed", className: "badge-blue" },
  SHIPPED: { label: "Shipped", className: "badge-blue" },
  DELIVERED: { label: "Delivered", className: "badge-green" },
  CANCELLED: { label: "Cancelled", className: "badge-gray" },
  RETURNED: { label: "Returned", className: "badge-red" },
  REFUNDED: { label: "Refunded", className: "badge-red" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = map[status];
  return <span className={meta.className}>{meta.label}</span>;
}
