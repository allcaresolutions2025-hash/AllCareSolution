import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { NewsForm } from "../news-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditNewsPage({ params }: { params: { id: string } }) {
  const post = await prisma.newsPost.findUnique({ where: { id: params.id } });
  if (!post) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <Link href="/admin/news" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to posts
        </Link>
        <h1 className="text-2xl font-bold">Edit Post</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Posted {new Date(post.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}
        </p>
      </div>
      <div className="card p-6">
        <NewsForm
          initial={{
            id: post.id,
            title: post.title,
            content: post.content,
            isPublished: post.isPublished,
            pinned: post.pinned,
          }}
        />
      </div>
    </div>
  );
}
