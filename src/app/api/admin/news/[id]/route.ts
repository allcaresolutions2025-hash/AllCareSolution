import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  content: z.string().trim().min(1).optional(),
  isPublished: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const post = await prisma.newsPost.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json({ ok: true, id: post.id });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  await prisma.newsPost.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
