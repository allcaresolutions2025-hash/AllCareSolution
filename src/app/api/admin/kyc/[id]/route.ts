import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const schema = z.object({ approve: z.boolean(), notes: z.string().optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.kycDetail.update({
    where: { id: params.id },
    data: {
      status: parsed.data.approve ? "APPROVED" : "REJECTED",
      reviewerNotes: parsed.data.notes || null,
      reviewedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
