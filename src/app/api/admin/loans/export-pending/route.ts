import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { tierByKey } from "@/lib/loan";
import { csvResponse, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

// Excel/CSV export of pending (REQUESTED) standard loan approvals, mirroring the
// admin "Pending loan requests" table so an admin can work through them offline.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const pendingLoans = await prisma.loan.findMany({
    where: { status: "REQUESTED", proMax: false },
    orderBy: { requestedAt: "asc" },
    include: {
      user: {
        select: {
          name: true, email: true, referralCode: true, phone: true, whatsappNumber: true,
          panNumber: true, leftLegCount: true, rightLegCount: true,
        },
      },
    },
  });

  // Count OTHER active loans (REQUESTED + APPROVED) per PAN, so the export flags
  // duplicate applications across the 15 IDs a PAN may hold — same as the table.
  const pendingPans = [...new Set(pendingLoans.map((l) => l.user.panNumber).filter(Boolean) as string[])];
  const panCounts = new Map<string, number>();
  if (pendingPans.length > 0) {
    const panAgg = await prisma.user.findMany({
      where: { panNumber: { in: pendingPans } },
      select: {
        panNumber: true,
        loans: { where: { status: { in: ["REQUESTED", "APPROVED"] } }, select: { id: true } },
      },
    });
    for (const u of panAgg) {
      if (!u.panNumber) continue;
      panCounts.set(u.panNumber, (panCounts.get(u.panNumber) ?? 0) + u.loans.length);
    }
  }

  const header = [
    "Requested at",
    "Member name",
    "Email",
    "Referral code",
    "Phone",
    "WhatsApp",
    "PAN",
    "Left leg",
    "Right leg",
    "Tier",
    "Amount (Rs.)",
    "Weeks",
    "Duplicate PAN loans",
  ];

  const rows: (string | number | null | undefined)[][] = [header];
  for (const l of pendingLoans) {
    const totalOnPan = l.user.panNumber ? panCounts.get(l.user.panNumber) ?? 0 : 0;
    const duplicates = l.user.panNumber ? Math.max(0, totalOnPan - 1) : 0;
    rows.push([
      l.requestedAt.toISOString(),
      l.user.name,
      l.user.email,
      l.user.referralCode,
      l.user.phone ?? "",
      l.user.whatsappNumber ?? "",
      l.user.panNumber ?? "",
      l.user.leftLegCount,
      l.user.rightLegCount,
      tierByKey(l.tierKey)?.label ?? l.tierKey,
      l.amount / 100,
      l.totalWeeks,
      duplicates,
    ]);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(`pending-loans-${stamp}.csv`, toCsv(rows));
}
