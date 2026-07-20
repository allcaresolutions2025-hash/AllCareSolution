import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard-shell";
import { LayoutDashboard, BadgeIndianRupee, AlertTriangle, Gift, Users } from "lucide-react";

// Franchise portal (indigo). A franchise leader signs in with their ordinary
// member account and enters here from the affiliate dashboard — there is no
// separate login. Access is re-checked against the DB on every request rather
// than read from the JWT, so an admin granting or revoking a franchise takes
// effect immediately instead of at the member's next sign-in.
const nav: DashboardNavItem[] = [
  { href: "/franchise", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/franchise/loans", label: "Loan Requests", icon: <BadgeIndianRupee className="h-4 w-4" /> },
  { href: "/franchise/unpaid", label: "Unpaid Loans", icon: <AlertTriangle className="h-4 w-4" /> },
  { href: "/franchise/welcome-kits", label: "Welcome Kits", icon: <Gift className="h-4 w-4" /> },
  { href: "/franchise/members", label: "My Members", icon: <Users className="h-4 w-4" /> },
];

export default async function FranchiseLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isFranchise: true },
  });
  if (!me?.isFranchise) redirect("/affiliate/dashboard");

  return (
    <div className="bg-franchise-soft min-h-screen py-6">
      <DashboardShell
        title="Franchise Center"
        description="Manage your team's loans & kits"
        nav={nav}
        variant="franchise"
      >
        {children}
      </DashboardShell>
    </div>
  );
}
