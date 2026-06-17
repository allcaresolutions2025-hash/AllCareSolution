import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { KycRow } from "./kyc-row";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function AdminKycPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const where: Prisma.KycDetailWhereInput = { status: { in: ["PENDING", "APPROVED", "REJECTED"] } };

  const [total, submissions] = await Promise.all([
    prisma.kycDetail.count({ where }),
    prisma.kycDetail.findMany({
      where,
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
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">KYC submissions</h1>
      <div className="card">
        <div className="overflow-x-auto">
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
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/kyc"
        />
      </div>
    </div>
  );
}
