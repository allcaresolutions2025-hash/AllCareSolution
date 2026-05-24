import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { formatPoints } from "@/lib/money";
import { csvResponse, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const requests = await prisma.payoutRequest.findMany({
    orderBy: [{ requestedAt: "desc" }],
    include: { user: { select: { name: true, email: true, phone: true, referralCode: true } } },
  });

  const header = [
    "Payout ID",
    "Requested at",
    "Processed at",
    "User name",
    "Email",
    "Phone",
    "Referral code",
    "Status",
    "Gross (points)",
    "TDS (points)",
    "Net (points)",
    "UTR",
    "Reviewer notes",
  ];

  const rows: (string | number | null | undefined)[][] = [header];
  for (const r of requests) {
    rows.push([
      r.id,
      r.requestedAt.toISOString(),
      r.processedAt ? r.processedAt.toISOString() : "",
      r.user.name,
      r.user.email,
      r.user.phone ?? "",
      r.user.referralCode,
      r.status,
      formatPoints(r.amountGross, { showLabel: false }),
      formatPoints(r.tdsAmount, { showLabel: false }),
      formatPoints(r.amountNet, { showLabel: false }),
      r.utr ?? "",
      r.reviewerNotes ?? "",
    ]);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(`payouts-${stamp}.csv`, toCsv(rows));
}
