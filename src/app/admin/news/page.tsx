import Link from "next/link";
import { prisma } from "@/lib/db";
import { Plus, Pin, Eye, EyeOff } from "lucide-react";
import { NewsQuickActions } from "./quick-actions";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  const posts = await prisma.newsPost.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  const published = posts.filter((p) => p.isPublished).length;
  const pinned = posts.filter((p) => p.pinned).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">News &amp; Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {published} published · {pinned} pinned · {posts.length} total
          </p>
        </div>
        <Link href="/admin/news/new" className="btn-primary shrink-0">
          <Plus className="h-4 w-4" /> New Post
        </Link>
      </div>

      {/* Post list */}
      {posts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-brand-100 grid place-items-center">
            <Eye className="h-7 w-7 text-brand-600" />
          </div>
          <p className="font-semibold text-lg">No posts yet</p>
          <p className="text-muted-foreground text-sm mt-1">Create your first announcement to inform your members.</p>
          <Link href="/admin/news/new" className="btn-primary mt-5 inline-flex">
            <Plus className="h-4 w-4" /> Create first post
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className={`card p-5 flex items-start gap-4 hover:shadow-md transition-shadow ${post.pinned ? "border-amber-200 bg-amber-50/30" : ""}`}
            >
              {/* Status dot */}
              <div className="mt-1 shrink-0">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${post.isPublished ? "bg-emerald-500" : "bg-slate-300"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {post.pinned && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Pin className="h-3 w-3" /> Pinned
                    </span>
                  )}
                  {!post.isPublished && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      <EyeOff className="h-3 w-3" /> Draft
                    </span>
                  )}
                  <h2 className="font-semibold text-slate-900 truncate">{post.title}</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {post.content}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(post.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
                  })}
                  {post.updatedAt > post.createdAt && " · edited"}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <NewsQuickActions
                  id={post.id}
                  isPublished={post.isPublished}
                  pinned={post.pinned}
                />
                <Link
                  href={`/admin/news/${post.id}`}
                  className="text-xs font-medium text-brand-700 hover:underline px-3 py-1.5 rounded-md border border-brand-200 hover:bg-brand-50"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
