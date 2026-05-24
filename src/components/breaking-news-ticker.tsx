import { prisma } from "@/lib/db";
import { BreakingNewsTickerClient } from "./breaking-news-ticker-client";

export async function BreakingNewsTicker() {
  const posts = await prisma.newsPost.findMany({
    where: { isPublished: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 10,
    select: { id: true, title: true },
  });

  if (posts.length === 0) return null;

  return <BreakingNewsTickerClient posts={posts} latestId={posts[0].id} />;
}
