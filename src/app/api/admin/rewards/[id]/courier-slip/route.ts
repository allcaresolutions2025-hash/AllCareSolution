import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getCourierSender } from "@/lib/courier";
import { buildCourierSlipPdf, type CourierRecipient } from "@/lib/courier-pdf";

// GET /api/admin/rewards/:id/courier-slip
// Streams a professional courier consignment note (PDF) for a reward claim —
// FROM = company sender details (admin-configured), TO = the member's address.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const claim = await prisma.rewardClaim.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          name: true,
          phone: true,
          whatsappNumber: true,
          referralCode: true,
          address: true,
          addresses: {
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            take: 1,
          },
        },
      },
    },
  });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  const sender = await getCourierSender();
  const u = claim.user;
  const addr = u.addresses[0];

  // Prefer the member's structured (default) address; fall back to the single
  // free-text address string on the user record.
  const recipient: CourierRecipient = addr
    ? {
        name: addr.fullName || u.name,
        line1: addr.line1,
        line2: addr.line2 ?? "",
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        phone: addr.phone || u.phone || u.whatsappNumber || "",
        code: u.referralCode,
      }
    : {
        name: u.name,
        line1: u.address ?? "",
        line2: "",
        city: "",
        state: "",
        pincode: "",
        phone: u.phone || u.whatsappNumber || "",
        code: u.referralCode,
      };

  const consignmentNo = `WK-${claim.id.slice(-8).toUpperCase()}`;
  const date = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const pdf = await buildCourierSlipPdf({
    sender,
    recipient,
    order: {
      consignmentNo,
      date,
      contents: claim.rewardName || "Welcome Kit",
      qty: "1",
      weight: "—",
      declaredValue: "—",
      payment: "Prepaid",
    },
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="courier-slip-${consignmentNo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
