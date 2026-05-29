"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

type Initial = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  metaDescription: string;
  isPublished: boolean;
};

export function BlogForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const url = isEdit ? `/api/admin/blog/${initial!.id}` : "/api/admin/blog";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, excerpt, content, coverImageUrl, metaDescription, isPublished }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.error(data.error || "Failed"); return; }
    toast.success(isEdit ? "Article saved" : "Article created");
    router.push("/admin/blog");
    router.refresh();
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm("Delete this article permanently?")) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/blog/${initial.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Article deleted");
    router.push("/admin/blog");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          className="input text-base font-medium"
          placeholder="e.g. 5 Ayurvedic herbs for everyday immunity"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Short summary</label>
        <textarea
          rows={2}
          className="input resize-none"
          placeholder="One or two lines shown on cards and in Google search results."
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          maxLength={500}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cover image URL</label>
        <input
          className="input font-mono text-xs"
          placeholder="https://… (optional hero image)"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">Paste a link to an image. Leave blank for no cover.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Content <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={16}
          className="input resize-y leading-relaxed font-mono text-sm"
          placeholder={"Write your article here.\n\nLeave a blank line between paragraphs.\nStart a line with ## for a heading.\nPaste any link (incl. Amazon affiliate links) and it becomes clickable."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Blank line = new paragraph · <code>## Heading</code> for sections · links auto-convert · affiliate links are tagged <code>rel=&quot;sponsored&quot;</code> automatically.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">SEO meta description</label>
        <input
          className="input text-sm"
          placeholder="Optional — overrides the summary for Google. ~150 chars."
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          maxLength={300}
        />
      </div>

      <button
        type="button"
        onClick={() => setIsPublished((v) => !v)}
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all w-full sm:w-auto ${
          isPublished ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-white border-slate-200 text-slate-500"
        }`}
      >
        {isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        <span>{isPublished ? "Published — live on /blog" : "Draft — hidden from public"}</span>
        <span className={`ml-auto h-5 w-9 rounded-full transition-colors flex items-center px-0.5 ${isPublished ? "bg-emerald-500" : "bg-slate-200"}`}>
          <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${isPublished ? "translate-x-4" : ""}`} />
        </span>
      </button>

      <div className="flex items-center justify-between gap-3 pt-2 border-t">
        <button type="button" onClick={() => router.back()} className="btn-outline">Cancel</button>
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
            {loading ? "Saving…" : isEdit ? "Save changes" : "Create article"}
          </button>
        </div>
      </div>
    </form>
  );
}
