import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  quantity: z.number().int().min(1).max(100),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, "Mobile must be 10 digits"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const request = await prisma.pinRequest.create({
    data: {
      userId: session.user.id,
      quantity: parsed.data.quantity,
      mobileNumber: parsed.data.mobileNumber,
    },
  });
  return NextResponse.json({ ok: true, id: request.id });
}
