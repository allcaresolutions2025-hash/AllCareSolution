import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(1),
  isPublished: z.boolean().optional().default(true),
  pinned: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const post = await prisma.newsPost.create({ data: parsed.data });
  return NextResponse.json({ ok: true, id: post.id });
}
