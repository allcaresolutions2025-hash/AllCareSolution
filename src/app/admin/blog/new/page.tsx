import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BlogForm } from "../blog-form";

export default function NewArticlePage() {
  return (
    <div className="max-w-3xl">
      <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to articles
      </Link>
      <h1 className="text-2xl font-bold mb-4">New article</h1>
      <div className="card p-6">
        <BlogForm />
      </div>
    </div>
  );
}
