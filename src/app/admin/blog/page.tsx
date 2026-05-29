import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { Plus, Pencil, ExternalLink, Eye, EyeOff } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const articles = await prisma.article.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Blog / Articles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish wellness articles to pull organic search traffic. This is the place for Amazon affiliate links and (later) display ads.
          </p>
        </div>
        <Link href="/admin/blog/new" className="btn-primary inline-flex items-center gap-2 shrink-0">
          <Plus className="h-4 w-4" /> New article
        </Link>
      </div>

      <div className="card overflow-hidden">
        {articles.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No articles yet. Click <strong>New article</strong> to write your first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Title</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Published</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2">
                      <div className="font-medium">{a.title}</div>
                      <div className="text-xs font-mono text-muted-foreground">/blog/{a.slug}</div>
                    </td>
                    <td className="px-4 py-2">
                      {a.isPublished ? (
                        <span className="badge-green"><Eye className="h-3 w-3" /> Published</span>
                      ) : (
                        <span className="badge-gray"><EyeOff className="h-3 w-3" /> Draft</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {a.publishedAt ? formatDate(a.publishedAt) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3 justify-end">
                        {a.isPublished && (
                          <Link href={`/blog/${a.slug}`} target="_blank" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs">
                            View <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        <Link href={`/admin/blog/${a.id}/edit`} className="text-brand-700 hover:underline inline-flex items-center gap-1 text-xs">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
