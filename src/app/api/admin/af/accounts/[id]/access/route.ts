import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Restore an AF account whose access was removed (User.isActive = false).
// Admins no longer remove whole AF accounts — they remove individual packages
// instead (POST /api/admin/af/packages/[id] { action: "remove" }) — so this
// only exists to bring back any account that was deactivated earlier.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, isAf: true, isActive: true, referralCode: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (!user.isAf) return NextResponse.json({ error: "Not an AF account" }, { status: 400 });
  if (user.isActive) return NextResponse.json({ error: "This AF account already has access." }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { isActive: true } });
    await tx.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: "AF_ACCESS_RESTORED",
        target: user.id,
        metadata: JSON.stringify({ afId: user.referralCode }),
      },
    });
    await tx.notification.create({
      data: {
        userId: user.id,
        title: "AF access restored",
        body: `The admin has restored access to your AF account ${user.referralCode}.`,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
