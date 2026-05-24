import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { KycForm } from "./kyc-form";

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [user, kyc] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        bankAccountName: true,
        bankAccountNumber: true,
        bankIfsc: true,
        bankName: true,
      },
    }),
    prisma.kycDetail.findUnique({ where: { userId: session.user.id } }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">KYC Verification</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Submit your PAN details and signed product acknowledgement form for identity
        verification. Your bank details are auto-filled from your registration.
      </p>

      {kyc?.status === "APPROVED" && (
        <div className="badge-green mt-4 inline-block">
          KYC verified · approved {kyc.reviewedAt ? new Date(kyc.reviewedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : ""}
        </div>
      )}
      {kyc?.status === "PENDING" && (
        <div className="badge-amber mt-4 inline-block">Under review</div>
      )}
      {kyc?.status === "REJECTED" && (
        <div className="card border-red-200 bg-red-50 p-3 mt-4">
          <p className="text-sm font-semibold text-red-800">KYC rejected</p>
          {kyc.reviewerNotes && <p className="text-sm text-red-700 mt-1">{kyc.reviewerNotes}</p>}
        </div>
      )}

      <div className="mt-6">
        <KycForm
          initial={kyc}
          bank={{
            accountName: user?.bankAccountName ?? "",
            accountNumber: user?.bankAccountNumber ?? "",
            ifsc: user?.bankIfsc ?? "",
            bankName: user?.bankName ?? "",
          }}
          disabled={kyc?.status === "APPROVED"}
        />
      </div>
    </div>
  );
}
