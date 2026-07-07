import { prisma } from "@/lib/db";
import { ShieldAlert } from "lucide-react";
import { UnlockRequestRow, type LinkedAccount } from "./unlock-request-row";

// Pending loan-unlock requests from members blocked by the identity/PAN-reuse
// guard. Each row lists the OTHER accounts sharing that member's email / mobile
// / PAN / bank so an admin can see the linked IDs at a glance (all red-flagged).
export async function LoanUnlockRequestsSection() {
  const requests = await prisma.loanUnlockRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { id: true, name: true, referralCode: true, email: true, phone: true, panNumber: true, bankAccountNumber: true },
      },
    },
  });

  if (requests.length === 0) return null;

  // Resolve linked accounts for each requester (shared email/phone/PAN/bank).
  const linkedByRequest = await Promise.all(
    requests.map(async (r) => {
      const u = r.user;
      const or: import("@prisma/client").Prisma.UserWhereInput[] = [];
      if (u.email) or.push({ email: u.email });
      if (u.phone) or.push({ phone: u.phone });
      if (u.panNumber) or.push({ panNumber: u.panNumber });
      if (u.bankAccountNumber) or.push({ bankAccountNumber: u.bankAccountNumber });
      if (or.length === 0) return [] as LinkedAccount[];

      const others = await prisma.user.findMany({
        where: { id: { not: u.id }, OR: or },
        select: {
          name: true,
          referralCode: true,
          email: true,
          phone: true,
          panNumber: true,
          bankAccountNumber: true,
          _count: { select: { loans: true } },
        },
      });

      return others.map((o): LinkedAccount => {
        const matchedOn: string[] = [];
        if (u.email && o.email === u.email) matchedOn.push("email");
        if (u.phone && o.phone === u.phone) matchedOn.push("mobile");
        if (u.panNumber && o.panNumber === u.panNumber) matchedOn.push("PAN");
        if (u.bankAccountNumber && o.bankAccountNumber === u.bankAccountNumber) matchedOn.push("bank");
        return {
          name: o.name,
          referralCode: o.referralCode,
          email: o.email,
          phone: o.phone,
          panNumber: o.panNumber,
          matchedOn,
          hasLoan: o._count.loans > 0,
        };
      });
    }),
  );

  return (
    <div className="card overflow-hidden ring-1 ring-red-200">
      <div className="p-5 border-b border-red-200 bg-red-50 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-red-700" />
        <h2 className="font-semibold text-red-900">Loan unlock requests ({requests.length})</h2>
        <span className="ml-auto text-xs text-red-700">Members blocked by shared email / PAN asking to be unlocked</span>
      </div>
      <div className="p-4 space-y-3">
        {requests.map((r, i) => (
          <UnlockRequestRow
            key={r.id}
            id={r.id}
            userName={r.user.name}
            userCode={r.user.referralCode}
            userEmail={r.user.email}
            userPhone={r.user.phone}
            userPan={r.user.panNumber}
            reason={r.reason}
            createdAt={r.createdAt.toISOString()}
            linked={linkedByRequest[i]}
          />
        ))}
      </div>
    </div>
  );
}
