import { prisma } from "@/lib/db";
import { KycRow } from "./kyc-row";

export const dynamic = "force-dynamic";

export default async function AdminKycPage() {
  const submissions = await prisma.kycDetail.findMany({
    where: { status: { in: ["PENDING", "APPROVED", "REJECTED"] } },
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
          bankAccountName: true,
          bankAccountNumber: true,
          bankIfsc: true,
          bankName: true,
        },
      },
    },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">KYC submissions</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">PAN</th>
              <th className="px-4 py-2 font-medium">Bank (from registration)</th>
              <th className="px-4 py-2 font-medium">Document</th>
              <th className="px-4 py-2 font-medium">Submitted</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((k) => (
              <KycRow
                key={k.id}
                id={k.id}
                user={k.user}
                panNumber={k.panNumber}
                panName={k.panName}
                productReceiptUrl={k.productReceiptUrl}
                status={k.status}
                submittedAt={k.submittedAt?.toISOString() ?? null}
              />
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No KYC submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
