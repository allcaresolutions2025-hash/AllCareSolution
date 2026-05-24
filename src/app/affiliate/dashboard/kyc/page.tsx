import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { KycForm } from "./kyc-form";

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const kyc = await prisma.kycDetail.findUnique({ where: { userId: session.user.id } });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">KYC — Identity & Shipping Details</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Used to verify identity and to dispatch reward gifts to the correct address when
        you reach a milestone. Points themselves carry no cash value and are never paid
        out as money.
      </p>

      {kyc?.status === "APPROVED" && (
        <div className="badge-green mt-4">KYC verified · approved {kyc.reviewedAt ? new Date(kyc.reviewedAt).toLocaleDateString("en-IN") : ""}</div>
      )}
      {kyc?.status === "PENDING" && (
        <div className="badge-amber mt-4">Under review</div>
      )}
      {kyc?.status === "REJECTED" && (
        <div className="card border-red-200 bg-red-50 p-3 mt-4">
          <p className="text-sm font-semibold text-red-800">KYC rejected</p>
          {kyc.reviewerNotes && <p className="text-sm text-red-700 mt-1">{kyc.reviewerNotes}</p>}
        </div>
      )}

      <div className="mt-6">
        <KycForm initial={kyc} disabled={kyc?.status === "APPROVED"} />
      </div>
    </div>
  );
}
