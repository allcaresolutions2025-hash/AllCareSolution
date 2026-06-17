import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { auditRequestedLoans } from "@/lib/loan-audit";

export const dynamic = "force-dynamic";

// Preview: list every REQUESTED loan with its current eligibility under the
// completely-filled-tree rule. Read-only — changes nothing.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const rows = await auditRequestedLoans();
  return NextResponse.json({
    rows,
    ineligibleCount: rows.filter((r) => !r.eligible).length,
    total: rows.length,
  });
}

// Apply: reject every REQUESTED loan whose user no longer qualifies. Eligibility
// is recomputed server-side here (never trusts the client), so this is safe to
// call directly. APPROVED/CLOSED loans are never touched.
export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const rows = await auditRequestedLoans();
  const ineligibleIds = rows.filter((r) => !r.eligible).map((r) => r.loanId);
  if (ineligibleIds.length === 0) {
    return NextResponse.json({ ok: true, locked: 0 });
  }

  const result = await prisma.loan.updateMany({
    // Guard on status again so a request approved between preview and apply
    // isn't clobbered.
    where: { id: { in: ineligibleIds }, status: "REQUESTED" },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      reviewerNotes:
        "Auto-locked: both legs must be completely filled to this level (no empty slots) to qualify.",
    },
  });

  return NextResponse.json({ ok: true, locked: result.count });
}
