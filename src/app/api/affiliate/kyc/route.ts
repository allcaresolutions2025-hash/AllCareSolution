import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { kycSchema } from "@/lib/validation";
import { ZodError } from "zod";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  try {
    const data = kycSchema.parse(await req.json());
    await prisma.kycDetail.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...data,
        status: "PENDING",
        submittedAt: new Date(),
      },
      update: {
        ...data,
        status: "PENDING",
        submittedAt: new Date(),
        reviewerNotes: null,
        reviewedAt: null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
