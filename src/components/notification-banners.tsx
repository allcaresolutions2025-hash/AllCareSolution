"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

// Renders unread in-app notifications as dismissible banners. Dismiss marks the
// notification read on the server.
export function NotificationBanners({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
    try {
      await fetch("/api/affiliate/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } catch {
      /* keep it dismissed locally even if the request fails */
    }
  }

  const visible = items.filter((n) => !dismissed.has(n.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((n) => (
        <div
          key={n.id}
          className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 flex items-start gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
            <Bell className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-emerald-900">{n.title}</div>
            <div className="text-xs text-emerald-800 mt-0.5">{n.body}</div>
          </div>
          <button
            onClick={() => dismiss(n.id)}
            aria-label="Dismiss"
            className="h-7 w-7 rounded-lg grid place-items-center text-emerald-700 hover:bg-emerald-100 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
