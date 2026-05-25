import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { signImpersonationToken } from "@/lib/impersonation";
import { prisma } from "@/lib/db";

// POST /api/admin/impersonate/exit
// Available to anyone whose current session was started via impersonation
// (session.user.impersonatedBy is set). Returns a token the browser uses to
// re-signIn as the original admin.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.impersonatedBy) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
  }
  const adminId = session.user.impersonatedBy;
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Original admin no longer valid" }, { status: 403 });
  }
  // The impersonate provider treats targetUserId === adminId as "switch back"
  // and clears impersonatedBy on the resulting session.
  const token = signImpersonationToken(adminId, adminId);
  return NextResponse.json({ ok: true, token });
}
