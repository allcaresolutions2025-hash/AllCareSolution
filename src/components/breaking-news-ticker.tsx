import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { BreakingNewsTickerClient } from "./breaking-news-ticker-client";

// News is published a few times a week at most. Cache the latest 10 posts for
// 60s — the ticker runs on every dashboard page navigation, so this avoids
// hammering the DB. Admin publishing a new post is at most 60s delayed; if
// that's too long we can wire revalidateTag on the publish endpoint.
const getLatestNews = unstable_cache(
  async () =>
    prisma.newsPost.findMany({
      where: { isPublished: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 10,
      select: { id: true, title: true },
    }),
  ["breaking-news-ticker"],
  { revalidate: 60, tags: ["news-posts"] },
);

export async function BreakingNewsTicker() {
  const posts = await getLatestNews();
  if (posts.length === 0) return null;
  return <BreakingNewsTickerClient posts={posts} latestId={posts[0].id} />;
}
