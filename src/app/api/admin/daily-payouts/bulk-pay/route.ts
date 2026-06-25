import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Pull only the ones still pending — silently skip already-paid/cancelled
  // so the UI can re-fire safely without errors on a stale selection.
  const pendings = await prisma.dailyPayout.findMany({
    where: { id: { in: parsed.data.ids }, status: "PENDING" },
    select: { id: true, userId: true, paidAmount: true, proMax: true },
  });

  if (pendings.length === 0) {
    return NextResponse.json({ ok: true, paidCount: 0, totalPaid: 0 });
  }

  const now = new Date();
  const totalPaid = pendings.reduce((sum, p) => sum + p.paidAmount, 0);

  // Aggregate per-user increments, split by program so each lifetime-paid
  // total (standard vs Pro Max) gets the right amount.
  const perUserStd = new Map<string, number>();
  const perUserProMax = new Map<string, number>();
  for (const p of pendings) {
    const bucket = p.proMax ? perUserProMax : perUserStd;
    bucket.set(p.userId, (bucket.get(p.userId) ?? 0) + p.paidAmount);
  }

  await prisma.$transaction(async (tx) => {
    await tx.dailyPayout.updateMany({
      where: { id: { in: pendings.map((p) => p.id) } },
      data: { status: "PAID", paidAt: now },
    });
    for (const [userId, delta] of Array.from(perUserStd.entries())) {
      await tx.wallet.update({
        where: { userId },
        data: { balancePaidLifetime: { increment: delta } },
      });
    }
    for (const [userId, delta] of Array.from(perUserProMax.entries())) {
      await tx.wallet.update({
        where: { userId },
        data: { proMaxBalancePaidLifetime: { increment: delta } },
      });
    }
  });

  return NextResponse.json({ ok: true, paidCount: pendings.length, totalPaid });
}
