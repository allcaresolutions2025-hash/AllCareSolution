"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff, Pin } from "lucide-react";

export function NewsQuickActions({
  id,
  isPublished,
  pinned,
}: {
  id: string;
  isPublished: boolean;
  pinned: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(data: Record<string, boolean>) {
    setBusy(true);
    const res = await fetch(`/api/admin/news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusy(false);
    if (!res.ok) { toast.error("Failed"); return; }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        disabled={busy}
        onClick={() => patch({ isPublished: !isPublished })}
        title={isPublished ? "Unpublish" : "Publish"}
        className={`p-1.5 rounded-md transition-colors ${isPublished ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"}`}
      >
        {isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <button
        disabled={busy}
        onClick={() => patch({ pinned: !pinned })}
        title={pinned ? "Unpin" : "Pin to top"}
        className={`p-1.5 rounded-md transition-colors ${pinned ? "text-amber-600 hover:bg-amber-50" : "text-slate-400 hover:bg-slate-100"}`}
      >
        <Pin className="h-4 w-4" />
      </button>
    </div>
  );
}
