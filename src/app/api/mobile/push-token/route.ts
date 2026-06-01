import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  token: z.string().min(8).max(200),
  platform: z.enum(["ios", "android"]).optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
    }

    await prisma.pushToken.upsert({
      where: { token: parsed.data.token },
      update: { userId: auth.user.id, platform: parsed.data.platform ?? null },
      create: {
        userId: auth.user.id,
        token: parsed.data.token,
        platform: parsed.data.platform ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return mobileServerError("push-token", e);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    await prisma.pushToken.deleteMany({
      where: { token, userId: auth.user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return mobileServerError("push-token.delete", e);
  }
}
