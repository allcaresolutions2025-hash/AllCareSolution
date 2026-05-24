import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const bodySchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(4).max(64),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { transactionPasswordHash: true },
  });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (me.transactionPasswordHash) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ error: "Current transaction password required" }, { status: 400 });
    }
    const ok = await bcrypt.compare(parsed.data.currentPassword, me.transactionPasswordHash);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const hash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { transactionPasswordHash: hash },
  });
  return NextResponse.json({ ok: true });
}
