"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Pin, Eye, EyeOff } from "lucide-react";

type Initial = {
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  pinned: boolean;
};

export function NewsForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = isEdit ? `/api/admin/news/${initial!.id}` : "/api/admin/news";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, isPublished, pinned }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error || "Failed"); return; }
    toast.success(isEdit ? "Post updated" : "Post published");
    router.push("/admin/news");
    router.refresh();
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Delete this post permanently?")) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/news/${initial.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Post deleted");
    router.push("/admin/news");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          className="input text-base font-medium"
          placeholder="e.g. New product launch this week!"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Content <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={10}
          className="input resize-none leading-relaxed"
          placeholder="Write your announcement here…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Plain text. Line breaks are preserved when displayed to members.
        </p>
      </div>

      {/* Toggles */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Toggle
          icon={isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          label={isPublished ? "Published — visible to members" : "Draft — hidden from members"}
          active={isPublished}
          activeColor="emerald"
          onToggle={() => setIsPublished((v) => !v)}
        />
        <Toggle
          icon={<Pin className="h-4 w-4" />}
          label={pinned ? "Pinned — shown at the top" : "Not pinned"}
          active={pinned}
          activeColor="amber"
          onToggle={() => setPinned((v) => !v)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-outline"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="btn-outline border-red-200 text-red-700 hover:bg-red-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
          <button type="submit" disabled={loading} className="btn-primary px-8">
            {loading ? "Saving…" : isEdit ? "Save changes" : "Publish post"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Toggle({
  icon, label, active, activeColor, onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  activeColor: "emerald" | "amber";
  onToggle: () => void;
}) {
  const colors = {
    emerald: active
      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
      : "bg-white border-slate-200 text-slate-500",
    amber: active
      ? "bg-amber-50 border-amber-300 text-amber-800"
      : "bg-white border-slate-200 text-slate-500",
  };
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all w-full ${colors[activeColor]}`}
    >
      {icon}
      <span>{label}</span>
      <span className={`ml-auto h-5 w-9 rounded-full transition-colors flex items-center px-0.5 ${active ? (activeColor === "emerald" ? "bg-emerald-500" : "bg-amber-500") : "bg-slate-200"}`}>
        <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}
