import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/slug";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().trim().min(2).max(200),
  excerpt: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().trim().min(1),
  coverImageUrl: z.string().trim().url().optional().or(z.literal("")),
  metaDescription: z.string().trim().max(300).optional().or(z.literal("")),
  isPublished: z.boolean().optional().default(false),
});

// Build a slug that's unique against existing articles (append -2, -3, …).
async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "article";
  let candidate = base;
  for (let i = 2; i < 1000; i++) {
    const exists = await prisma.article.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;

  const article = await prisma.article.create({
    data: {
      slug: await uniqueSlug(d.title),
      title: d.title,
      excerpt: d.excerpt || null,
      content: d.content,
      coverImageUrl: d.coverImageUrl || null,
      metaDescription: d.metaDescription || null,
      isPublished: d.isPublished,
      publishedAt: d.isPublished ? new Date() : null,
    },
  });
  return NextResponse.json({ ok: true, id: article.id, slug: article.slug });
}
