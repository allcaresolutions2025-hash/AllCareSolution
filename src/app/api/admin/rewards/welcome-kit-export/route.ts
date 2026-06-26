import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { csvResponse, toCsv } from "@/lib/csv";
import { WELCOME_KIT_LEVEL } from "@/lib/rewards";

// Excel-compatible CSV of Welcome Kit claims to DISPATCH. Welcome Kit (level 0)
// is the only physical reward — the L1-15 ladder pays Pin Wallet points.
//
// Default exports APPROVED claims (the to-ship queue). ?status=DISPATCHED gives
// the in-transit list. Includes the member's address for the courier.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const status = new URL(req.url).searchParams.get("status") === "DISPATCHED" ? "DISPATCHED" : "APPROVED";

  const claims = await prisma.rewardClaim.findMany({
    where: { level: WELCOME_KIT_LEVEL, status },
    orderBy: { requestedAt: "asc" },
    include: {
      user: {
        select: { referralCode: true, name: true, phone: true, whatsappNumber: true, email: true, address: true },
      },
    },
  });

  const header = [
    "ID Number",
    "Name",
    "Mobile",
    "WhatsApp",
    "Email",
    "Address",
    "Reward",
    "Status",
    "Requested",
  ];
  const rows: (string | number | null | undefined)[][] = [header];
  for (const c of claims) {
    rows.push([
      c.user.referralCode,
      c.user.name,
      c.user.phone ?? "",
      c.user.whatsappNumber ?? "",
      c.user.email,
      c.user.address ?? "",
      c.rewardName,
      c.status,
      c.requestedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }),
    ]);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(`welcome-kit-dispatch-${status.toLowerCase()}-${stamp}.csv`, toCsv(rows));
}
