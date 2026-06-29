import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";
import { signImpersonationToken } from "@/lib/impersonation";

export const dynamic = "force-dynamic";

// POST /api/promax-admin/impersonate/:userId
// Pro Max admin issues a short-lived signed token to log in as a Pro Max member.
// Restricted to active Pro Max accounts only.
export async function POST(_req: Request, { params }: { params: { userId: string } }) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, isActive: true, isProMax: true, name: true },
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!target.isProMax) return NextResponse.json({ error: "Not a Pro Max member" }, { status: 400 });
  if (!target.isActive) return NextResponse.json({ error: "User is inactive" }, { status: 400 });

  const token = signImpersonationToken(auth.session.user.id, target.id);
  return NextResponse.json({ ok: true, token, targetName: target.name });
}
