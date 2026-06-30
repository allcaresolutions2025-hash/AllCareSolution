import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { ArticleContent } from "@/components/article-content";
import { getSiteBrand } from "@/lib/brand";
import { ArrowLeft, Info, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

async function getArticle(slug: string) {
  return prisma.article.findFirst({
    where: { slug, isPublished: true },
    select: {
      title: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      metaDescription: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) return { title: "Article not found" };
  const description = article.metaDescription || article.excerpt || `${article.title} — ACHT MART wellness blog.`;
  return {
    title: article.title,
    description,
    openGraph: {
      title: article.title,
      description,
      type: "article",
      images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  if (!article) notFound();

  const brand = await getSiteBrand();
  const amazonUrl = brand.amazonAffiliateUrl?.trim() || "";
  const showAmazon = /^https?:\/\//i.test(amazonUrl);
  // Show the disclosure whenever there's any affiliate link on the page — either
  // the "Shop on Amazon" button or an Amazon link inside the article content.
  const hasAffiliate = showAmazon || /amazon\.|amzn\./i.test(article.content);

  // Article structured data for richer Google results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription || article.excerpt || undefined,
    image: article.coverImageUrl || undefined,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    publisher: { "@type": "Organization", name: "ACHT MART" },
  };

  return (
    <article className="container-page max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-3.5 w-3.5" /> All articles
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">{article.title}</h1>
      {article.publishedAt && (
        <div className="text-sm text-muted-foreground mt-2">{formatDate(article.publishedAt)}</div>
      )}

      {article.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.coverImageUrl} alt={article.title} className="w-full rounded-xl mt-5 object-cover max-h-[420px]" />
      )}

      {article.excerpt && (
        <p className="text-lg text-slate-600 mt-5 leading-relaxed">{article.excerpt}</p>
      )}

      <div className="mt-6">
        <ArticleContent content={article.content} />
      </div>

      {showAmazon && (
        <div className="mt-8 rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-bold text-slate-900">Shop our picks on Amazon</div>
            <div className="text-sm text-slate-600 mt-0.5">Browse recommended wellness products on Amazon.</div>
          </div>
          <a
            href={amazonUrl}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF9900] hover:bg-[#e88a00] text-slate-900 font-bold text-sm transition-colors shrink-0"
          >
            <ShoppingBag className="h-4 w-4" /> Shop on Amazon
          </a>
        </div>
      )}

      {hasAffiliate && (
        <div className="mt-8 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            <strong>Affiliate disclosure:</strong> This article contains affiliate links. As an Amazon Associate,
            ACHT MART earns from qualifying purchases — at no extra cost to you. We only recommend products we believe add value.
          </p>
        </div>
      )}

      <div className="mt-10 card card-brand p-6 text-center">
        <h3 className="text-lg font-bold">Explore ACHT MART wellness products</h3>
        <p className="text-sm text-white/90 mt-1">Authentic Ayurvedic & herbal products, delivered across India.</p>
        <Link href="/products" className="inline-flex mt-4 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-50 transition-colors">
          Shop the collection
        </Link>
      </div>
    </article>
  );
}
