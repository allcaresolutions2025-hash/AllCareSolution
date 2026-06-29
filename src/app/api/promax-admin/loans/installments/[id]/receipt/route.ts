import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProMaxAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireProMaxAdmin();
  if (!auth.ok) return auth.response;

  const inst = await prisma.loanInstallment.findUnique({
    where: { id: params.id },
    select: { receiptMime: true, receiptBase64: true, loan: { select: { proMax: true } } },
  });
  if (!inst || !inst.loan.proMax || !inst.receiptBase64 || !inst.receiptMime) {
    return NextResponse.json({ error: "No receipt on file" }, { status: 404 });
  }
  return NextResponse.json({ mime: inst.receiptMime, data: inst.receiptBase64 });
}
