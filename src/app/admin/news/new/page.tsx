import { NewsForm } from "../news-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewNewsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <Link href="/admin/news" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to posts
        </Link>
        <h1 className="text-2xl font-bold">New Announcement</h1>
        <p className="text-sm text-muted-foreground mt-1">Write and publish an update for your members.</p>
      </div>
      <div className="card p-6">
        <NewsForm />
      </div>
    </div>
  );
}
