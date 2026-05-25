import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { signImpersonationToken } from "@/lib/impersonation";

// POST /api/admin/impersonate/:userId
// Issues a short-lived signed token the browser hands to NextAuth's
// "impersonate" credentials provider via signIn(). Only admins can call this.
export async function POST(_req: Request, { params }: { params: { userId: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, isActive: true, name: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!target.isActive) {
    return NextResponse.json({ error: "User is inactive" }, { status: 400 });
  }

  const token = signImpersonationToken(auth.session.user.id, target.id);
  return NextResponse.json({ ok: true, token, targetName: target.name });
}
