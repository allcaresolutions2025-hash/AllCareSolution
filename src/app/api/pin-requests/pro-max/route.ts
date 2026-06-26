import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// A single Pro Max request endpoint that serves two cases (admin approval for
// both), distinguished at approval time by whether the requester is Pro Max:
//   - NON-Pro-Max requester  → "request to become Pro Max"
//   - Pro-Max requester      → "request Pro Max pins" (quantity) to grow the tree
// Only ONE pending Pro Max request is allowed at a time.
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
