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

  const pendings = await prisma.dailyPayout.findMany({
    where: { id: { in: parsed.data.ids }, status: "PENDING" },
    select: { id: true, userId: true, startBalance: true },
  });

  if (pendings.length === 0) {
    return NextResponse.json({ ok: true, restoredCount: 0, totalRestored: 0 });
  }

  // Aggregate restore deltas per-user so each wallet gets exactly one update.
  const perUser = new Map<string, number>();
  for (const p of pendings) {
    perUser.set(p.userId, (perUser.get(p.userId) ?? 0) + p.startBalance);
  }

  const totalRestored = pendings.reduce((sum, p) => sum + p.startBalance, 0);

  await prisma.$transaction(async (tx) => {
    await tx.dailyPayout.updateMany({
      where: { id: { in: pendings.map((p) => p.id) } },
      data: { status: "CANCELLED" },
    });
    for (const [userId, delta] of Array.from(perUser.entries())) {
      await tx.wallet.update({
        where: { userId },
        data: { balanceAvailable: { increment: delta } },
      });
    }
  });

  return NextResponse.json({ ok: true, restoredCount: pendings.length, totalRestored });
}
