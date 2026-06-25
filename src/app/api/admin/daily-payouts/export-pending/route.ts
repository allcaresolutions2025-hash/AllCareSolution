import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { formatPoints } from "@/lib/money";
import { csvResponse, toCsv } from "@/lib/csv";

// Excel-compatible CSV of *PENDING* daily payouts — the admin downloads this
// after a midnight (or simulate) run, sends the money offline to each member's
// bank, then comes back and marks the rows as Paid. Same column layout as the
// finalized payouts export so the two sheets are interchangeable.
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
    where: { status: "PENDING" },
    orderBy: [{ runDate: "desc" }, { createdAt: "asc" }],
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
    "Program",
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
      p.proMax ? "Pro Max" : "Standard",
      p.user.phone ?? "",
      p.user.bankAccountNumber ?? "",
      p.user.bankIfsc ?? "",
      formatPoints(p.paidAmount,    { showLabel: false }),
      formatPoints(p.forfeitAmount, { showLabel: false }),
      formatPoints(p.startBalance,  { showLabel: false }),
    ]);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(`daily-payouts-pending-${stamp}.csv`, toCsv(rows));
}
