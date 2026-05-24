import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const inst = await prisma.loanInstallment.findUnique({
    where: { id: params.id },
    select: { receiptMime: true, receiptBase64: true },
  });
  if (!inst || !inst.receiptBase64 || !inst.receiptMime) {
    return NextResponse.json({ error: "No receipt on file" }, { status: 404 });
  }
  return NextResponse.json({ mime: inst.receiptMime, data: inst.receiptBase64 });
}
