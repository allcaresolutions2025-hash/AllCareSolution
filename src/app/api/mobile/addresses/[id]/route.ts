import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;
    const existing = await prisma.address.findFirst({
      where: { id: ctx.params.id, userId: auth.user.id },
    });
    if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });
    await prisma.address.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return mobileServerError("addresses.delete", e);
  }
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;
    const existing = await prisma.address.findFirst({
      where: { id: ctx.params.id, userId: auth.user.id },
    });
    if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });

    const body = (await req.json().catch(() => null)) as { isDefault?: boolean } | null;
    if (!body || body.isDefault !== true) {
      return NextResponse.json({ error: "Only isDefault=true is supported" }, { status: 400 });
    }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId: auth.user.id, isDefault: true },
        data: { isDefault: false },
      });
      return tx.address.update({
        where: { id: existing.id },
        data: { isDefault: true },
      });
    });
    return NextResponse.json({ address: updated });
  } catch (e) {
    return mobileServerError("addresses.update", e);
  }
}
