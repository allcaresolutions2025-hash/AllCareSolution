import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Mark a notification read (or all of the member's notifications when no id).
const bodySchema = z.object({ id: z.string().min(1).optional() });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  const id = parsed.success ? parsed.data.id : undefined;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false, ...(id ? { id } : {}) },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
