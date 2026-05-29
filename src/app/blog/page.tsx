import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wellness Blog",
  description: "Ayurvedic remedies, herbal wellness tips, and natural-living guides from ACHT MART.",
};

export default async function BlogIndexPage() {
  const articles = await prisma.article.findMany({
    where: { isPublished: true },
    orderBy: [{ publishedAt: "desc" }],
    select: { id: true, slug: true, title: true, excerpt: true, coverImageUrl: true, publishedAt: true },
  });

  return (
    <div className="container-page max-w-5xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-brand-700 text-sm font-semibold mb-2">
          <BookOpen className="h-4 w-4" /> ACHT MART Wellness Blog
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gradient-brand">Ayurvedic wellness, simplified</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Practical herbal remedies, immunity tips, and natural-living guides — written for everyday Indian homes.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="card p-12 text-center text-sm text-muted-foreground">
          No articles published yet. Check back soon!
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((a) => (
            <Link key={a.id} href={`/blog/${a.slug}`} className="card card-interactive overflow-hidden flex flex-col">
              {a.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.coverImageUrl} alt={a.title} className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 w-full bg-brand-gradient grid place-items-center">
                  <BookOpen className="h-8 w-8 text-white/80" />
                </div>
              )}
              <div className="p-4 flex flex-col flex-1">
                <h2 className="font-bold leading-snug text-slate-900 line-clamp-2">{a.title}</h2>
                {a.excerpt && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-3 flex-1">{a.excerpt}</p>}
                {a.publishedAt && (
                  <div className="text-xs text-muted-foreground mt-3">{formatDate(a.publishedAt)}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
