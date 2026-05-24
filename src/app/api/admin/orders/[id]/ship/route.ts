import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { z } from "zod";

const schema = z.object({
  trackingNumber: z.string().min(1),
  courier: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.order.update({
    where: { id: params.id },
    data: {
      status: "SHIPPED",
      shippedAt: new Date(),
      trackingNumber: parsed.data.trackingNumber,
      courier: parsed.data.courier,
    },
  });
  return NextResponse.json({ ok: true });
}
