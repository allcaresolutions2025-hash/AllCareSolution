import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { reverseCommissionsForOrder } from "@/lib/commission";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  await prisma.order.update({
    where: { id: params.id },
    data: { status: "RETURNED", returnedAt: new Date() },
  });
  await reverseCommissionsForOrder(params.id);
  return NextResponse.json({ ok: true });
}
