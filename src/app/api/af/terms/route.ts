import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAfAccount } from "@/lib/af";

export const dynamic = "force-dynamic";

// AF account accepts the AF Terms & Conditions (/af/dashboard/terms). Recorded
// once; required before any package request.
export async function POST() {
  const auth = await requireAfAccount();
  if (!auth.ok) return auth.response;

  const me = await prisma.user.findUnique({
    where: { id: auth.session.user.id },
    select: { afTermsAcceptedAt: true },
  });
  if (!me?.afTermsAcceptedAt) {
    await prisma.user.update({
      where: { id: auth.session.user.id },
      data: { afTermsAcceptedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: { actorId: auth.session.user.id, action: "AF_TERMS_ACCEPTED", target: auth.session.user.id },
    });
  }
  return NextResponse.json({ ok: true });
}
