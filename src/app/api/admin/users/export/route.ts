import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { formatPoints } from "@/lib/money";
import { csvResponse, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      wallet: true,
      _count: {
        select: {
          referrals: true,
          orders: { where: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } } },
        },
      },
      referrer: { select: { name: true, email: true, referralCode: true } },
    },
  });

  const header = [
    "User ID",
    "Created at",
    "Name",
    "Email",
    "Phone",
    "Role",
    "Active",
    "Referral code",
    "Referred by (email)",
    "Referred by (code)",
    "Direct referrals",
    "Completed orders",
    "Points pending",
    "Points available",
    "Points lifetime paid",
  ];

  const rows: (string | number | null | undefined)[][] = [header];
  for (const u of users) {
    rows.push([
      u.id,
      u.createdAt.toISOString(),
      u.name,
      u.email,
      u.phone ?? "",
      u.role,
      u.isActive ? "yes" : "no",
      u.referralCode,
      u.referrer?.email ?? "",
      u.referrer?.referralCode ?? "",
      u._count.referrals,
      u._count.orders,
      formatPoints(u.wallet?.balancePending ?? 0, { showLabel: false }),
      formatPoints(u.wallet?.balanceAvailable ?? 0, { showLabel: false }),
      formatPoints(u.wallet?.balancePaidLifetime ?? 0, { showLabel: false }),
    ]);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(`users-${stamp}.csv`, toCsv(rows));
}
