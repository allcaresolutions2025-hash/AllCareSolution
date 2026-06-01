import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authMobile, mobileServerError } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

const addressInput = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().min(4).max(10),
  isDefault: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;
    const addresses = await prisma.address.findMany({
      where: { userId: auth.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ addresses });
  } catch (e) {
    return mobileServerError("addresses.list", e);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authMobile(req);
    if ("response" in auth) return auth.response;
    const parsed = addressInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }
    const data = parsed.data;
    const created = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId: auth.user.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      const existingCount = await tx.address.count({ where: { userId: auth.user.id } });
      return tx.address.create({
        data: {
          userId: auth.user.id,
          fullName: data.fullName,
          phone: data.phone,
          line1: data.line1,
          line2: data.line2 ?? null,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          isDefault: data.isDefault ?? existingCount === 0,
        },
      });
    });
    return NextResponse.json({ address: created });
  } catch (e) {
    return mobileServerError("addresses.create", e);
  }
}
