import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const posts = await prisma.newsPost.findMany({
      where: { isPublished: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 30,
      select: { id: true, title: true, content: true, createdAt: true, pinned: true },
    });
    return NextResponse.json({ posts });
  } catch (e) {
    return mobileServerError("news", e);
  }
}
