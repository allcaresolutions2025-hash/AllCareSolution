import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { BlogForm } from "../../blog-form";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to articles
      </Link>
      <h1 className="text-2xl font-bold mb-4">Edit article</h1>
      <div className="card p-6">
        <BlogForm
          initial={{
            id: article.id,
            title: article.title,
            excerpt: article.excerpt ?? "",
            content: article.content,
            coverImageUrl: article.coverImageUrl ?? "",
            metaDescription: article.metaDescription ?? "",
            isPublished: article.isPublished,
          }}
        />
      </div>
    </div>
  );
}
