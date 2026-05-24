import { prisma } from "@/lib/db";
import { Pin, Megaphone, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

const isNew = (date: Date) => Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000;

export default async function MemberNewsPage() {
  const posts = await prisma.newsPost.findMany({
    where: { isPublished: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-800 to-emerald-900 p-6 text-white shadow-lg">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-20 h-20 w-20 rounded-full bg-amber-400/10" />
        <div className="relative flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/15 grid place-items-center shrink-0">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">News &amp; Updates</h1>
            <p className="text-brand-200 text-sm mt-0.5">
              {posts.length === 0
                ? "No announcements yet"
                : `${posts.length} announcement${posts.length !== 1 ? "s" : ""} from ACHT MART`}
            </p>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {posts.length === 0 && (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 grid place-items-center">
            <Megaphone className="h-7 w-7 text-slate-400" />
          </div>
          <p className="font-semibold text-lg text-slate-700">Nothing here yet</p>
          <p className="text-muted-foreground text-sm mt-1">
            Admin announcements and product updates will appear here.
          </p>
        </div>
      )}

      {/* Pinned posts */}
      {posts.filter((p) => p.pinned).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
            <Pin className="h-3.5 w-3.5" /> Pinned
          </div>
          {posts.filter((p) => p.pinned).map((post) => (
            <NewsCard key={post.id} post={post} variant="pinned" />
          ))}
        </div>
      )}

      {/* Regular posts */}
      {posts.filter((p) => !p.pinned).length > 0 && (
        <div className="space-y-3">
          {posts.filter((p) => p.pinned).length > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Recent
            </div>
          )}
          {posts.filter((p) => !p.pinned).map((post) => (
            <NewsCard key={post.id} post={post} variant="regular" />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCard({
  post,
  variant,
}: {
  post: { id: string; title: string; content: string; createdAt: Date; updatedAt: Date; pinned: boolean };
  variant: "pinned" | "regular";
}) {
  const fresh = isNew(post.createdAt);

  return (
    <div
      className={`rounded-2xl border p-5 transition-shadow hover:shadow-md ${
        variant === "pinned"
          ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
          : "bg-white border-slate-100"
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {variant === "pinned" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full uppercase tracking-wide">
              <Pin className="h-2.5 w-2.5" /> Pinned
            </span>
          )}
          {fresh && (
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
              New
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
          {timeAgo(new Date(post.createdAt))}
        </span>
      </div>

      {/* Title */}
      <h2 className={`font-bold text-base leading-snug ${variant === "pinned" ? "text-amber-900" : "text-slate-900"}`}>
        {post.title}
      </h2>

      {/* Content */}
      <p className={`mt-2 text-sm leading-relaxed whitespace-pre-line ${variant === "pinned" ? "text-amber-800/80" : "text-slate-600"}`}>
        {post.content}
      </p>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-current/10 flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-brand-700 grid place-items-center shrink-0">
          <span className="text-white text-[10px] font-bold">A</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">ACHT MART Admin</span>
        {post.updatedAt > post.createdAt && (
          <span className="text-xs text-muted-foreground ml-auto">
            Updated {timeAgo(new Date(post.updatedAt))}
          </span>
        )}
      </div>
    </div>
  );
}
