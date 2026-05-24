import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { formatPoints } from "@/lib/money";
import { csvResponse, toCsv } from "@/lib/csv";

// Excel-compatible CSV (BOM + comma) of PAID daily payouts — the bank-transfer
// register the admin sends out to settle the day's payouts.
//
// Columns (in order):
//   ID Number              -> user.referralCode
//   Name                   -> user.name
//   Mobile Number          -> user.phone
//   Bank Account Number    -> user.bankAccountNumber
//   IFSC Code              -> user.bankIfsc
//   Payout Points          -> paidAmount (the 90% being paid out)
//   Discounted Amount      -> forfeitAmount (the 10% cut)
//   Total Amount           -> startBalance (original points before discount)

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const payouts = await prisma.dailyPayout.findMany({
    where: { status: "PAID" },
    orderBy: [{ paidAt: "desc" }, { runDate: "desc" }],
    include: {
      user: {
        select: {
          referralCode: true,
          name: true,
          phone: true,
          bankAccountNumber: true,
          bankIfsc: true,
        },
      },
    },
  });

  const header = [
    "ID Number",
    "Name",
    "Mobile Number",
    "Bank Account Number",
    "IFSC Code",
    "Payout Points",
    "Discounted Amount",
    "Total Amount",
  ];

  const rows: (string | number | null | undefined)[][] = [header];
  for (const p of payouts) {
    rows.push([
      p.user.referralCode,
      p.user.name,
      p.user.phone ?? "",
      p.user.bankAccountNumber ?? "",
      p.user.bankIfsc ?? "",
      formatPoints(p.paidAmount,    { showLabel: false }),
      formatPoints(p.forfeitAmount, { showLabel: false }),
      formatPoints(p.startBalance,  { showLabel: false }),
    ]);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(`daily-payouts-${stamp}.csv`, toCsv(rows));
}
