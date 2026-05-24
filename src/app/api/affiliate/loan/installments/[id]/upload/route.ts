import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const MAX_BASE64_LEN = 3_000_000; // ~2.25 MB raw

const bodySchema = z.object({
  mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  data: z.string().min(10).max(MAX_BASE64_LEN),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const installment = await prisma.loanInstallment.findUnique({
    where: { id: params.id },
    include: { loan: { select: { userId: true, status: true } } },
  });
  if (!installment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (installment.loan.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (installment.loan.status !== "APPROVED") {
    return NextResponse.json({ error: "Loan not active" }, { status: 400 });
  }
  if (installment.status === "VERIFIED") {
    return NextResponse.json({ error: "Installment already verified" }, { status: 400 });
  }

  await prisma.loanInstallment.update({
    where: { id: installment.id },
    data: {
      receiptMime: parsed.data.mime,
      receiptBase64: parsed.data.data,
      uploadedAt: new Date(),
      status: "RECEIPT_UPLOADED",
      reviewerNotes: null, // clear any prior rejection note when re-uploading
    },
  });

  return NextResponse.json({ ok: true });
}
