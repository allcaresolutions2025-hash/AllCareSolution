import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "DISPATCHED", "DELIVERED", "REJECTED"]),
  adminNote: z.string().max(500).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const claim = await prisma.rewardClaim.findUnique({ where: { id: params.id } });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  const updated = await prisma.rewardClaim.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      adminNote: parsed.data.adminNote ?? null,
    },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
