import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { getAllBusinessSettings } from "@/lib/settings";
import { buybackDateFrom } from "@/lib/utils";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const now = new Date();
  const settings = await getAllBusinessSettings();
  const buybackUntil = buybackDateFrom(now, settings.BUYBACK_DAYS);

  await prisma.order.update({
    where: { id: params.id },
    data: {
      status: "DELIVERED",
      deliveredAt: now,
      buybackUntil,
    },
  });
  return NextResponse.json({ ok: true });
}
