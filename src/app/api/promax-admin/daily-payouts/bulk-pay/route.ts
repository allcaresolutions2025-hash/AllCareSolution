import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) });

export async function POST(req: Request) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const pendings = await prisma.dailyPayout.findMany({
    where: { id: { in: parsed.data.ids }, status: "PENDING", proMax: true },
    select: { id: true, userId: true, paidAmount: true },
  });
  if (pendings.length === 0) return NextResponse.json({ ok: true, paidCount: 0, totalPaid: 0 });

  const totalPaid = pendings.reduce((s, p) => s + p.paidAmount, 0);
  const perUser = new Map<string, number>();
  for (const p of pendings) perUser.set(p.userId, (perUser.get(p.userId) ?? 0) + p.paidAmount);

  await prisma.$transaction(async (tx) => {
    await tx.dailyPayout.updateMany({
      where: { id: { in: pendings.map((p) => p.id) } },
      data: { status: "PAID", paidAt: new Date() },
    });
    for (const [userId, delta] of Array.from(perUser.entries())) {
      await tx.wallet.update({ where: { userId }, data: { proMaxBalancePaidLifetime: { increment: delta } } });
    }
  });

  return NextResponse.json({ ok: true, paidCount: pendings.length, totalPaid });
}
