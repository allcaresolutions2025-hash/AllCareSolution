import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  excerpt: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().trim().min(1).optional(),
  coverImageUrl: z.string().trim().url().optional().or(z.literal("")),
  metaDescription: z.string().trim().max(300).optional().or(z.literal("")),
  isPublished: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const d = parsed.data;

  const existing = await prisma.article.findUnique({ where: { id: params.id }, select: { publishedAt: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const article = await prisma.article.update({
    where: { id: params.id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.excerpt !== undefined ? { excerpt: d.excerpt || null } : {}),
      ...(d.content !== undefined ? { content: d.content } : {}),
      ...(d.coverImageUrl !== undefined ? { coverImageUrl: d.coverImageUrl || null } : {}),
      ...(d.metaDescription !== undefined ? { metaDescription: d.metaDescription || null } : {}),
      ...(d.isPublished !== undefined
        ? {
            isPublished: d.isPublished,
            // Stamp publishedAt the first time it goes live; keep it thereafter.
            publishedAt: d.isPublished ? existing.publishedAt ?? new Date() : existing.publishedAt,
          }
        : {}),
    },
  });
  return NextResponse.json({ ok: true, id: article.id, slug: article.slug });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await prisma.article.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
