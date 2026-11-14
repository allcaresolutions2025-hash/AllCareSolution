import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { daysBetween } from "@/lib/af";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  active: z.boolean(),
  reason: z.string().trim().max(300).optional(),
});

// Admin removes (or restores) an AF account's access. Removing deactivates the
// AF login (User.isActive = false): sign-in is refused, the AF dashboard and
// /api/af/* routes reject any session still open, and withdrawals are blocked.
// Balances, packages and tree placement are left as they are, so restoring
// access puts the account back exactly where it was.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { active } = parsed.data;
  const reason = parsed.data.reason || undefined;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, isAf: true, isActive: true, referralCode: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (!user.isAf) return NextResponse.json({ error: "Not an AF account" }, { status: 400 });
  if (user.isActive === active) {
    return NextResponse.json(
      { error: active ? "This AF account already has access." : "AF access is already removed." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { isActive: active } });
    await tx.auditLog.create({
      data: {
        actorId: auth.session.user.id,
        action: active ? "AF_ACCESS_RESTORED" : "AF_ACCESS_REMOVED",
        target: user.id,
        metadata: JSON.stringify({ afId: user.referralCode, daysActive: daysBetween(user.createdAt), reason }),
      },
    });
    await tx.notification.create({
      data: {
        userId: user.id,
        title: active ? "AF access restored" : "AF access removed",
        body: active
          ? `The admin has restored access to your AF account ${user.referralCode}.`
          : `The admin has removed access to your AF account ${user.referralCode}.${reason ? ` Reason: ${reason}` : ""}`,
      },
    });
  });

  return NextResponse.json({ ok: true, active });
}
