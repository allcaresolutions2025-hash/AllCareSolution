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
    const body = await req.json();

    // Enforce 5 MB cap on base64 payload (base64 overhead ~33%)
    const receiptStr: string = body.productReceiptUrl ?? "";
    if (receiptStr.length > 7 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large — max 5 MB" }, { status: 400 });
    }

    const data = kycSchema.parse(body);

    await prisma.kycDetail.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        panNumber: data.panNumber,
        panName: data.panName,
        productReceiptUrl: data.productReceiptUrl ?? null,
        status: "PENDING",
        submittedAt: new Date(),
      },
      update: {
        panNumber: data.panNumber,
        panName: data.panName,
        productReceiptUrl: data.productReceiptUrl ?? null,
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
