import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Request to BECOME Pro Max — admin reviews it, and on approval the member is
// flagged Pro Max in place. A member may have only ONE such request at a time:
// rejected once already Pro Max, or while a request is still pending.
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

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isProMax: true },
  });
  if (me?.isProMax) {
    return NextResponse.json({ error: "You're already a Pro Max member." }, { status: 400 });
  }

  const pending = await prisma.pinRequest.findFirst({
    where: { userId: session.user.id, proMax: true, status: "PENDING" },
    select: { id: true },
  });
  if (pending) {
    return NextResponse.json(
      { error: "You already have a Pro Max request awaiting admin approval." },
      { status: 400 },
    );
  }

  const request = await prisma.pinRequest.create({
    data: {
      userId: session.user.id,
      quantity: parsed.data.quantity,
      mobileNumber: parsed.data.mobileNumber,
      proMax: true,
    },
  });
  return NextResponse.json({ ok: true, id: request.id });
}
