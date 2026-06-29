import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard-shell";
import { LayoutDashboard, UserPlus, Sparkles, KeyRound, GitBranch, Trophy, Wallet, WalletCards, BadgeIndianRupee, LogIn, Settings as SettingsIcon } from "lucide-react";

// Pro Max ADMIN portal (violet). Separate login + dedicated PROMAX_ADMIN role.
const nav: DashboardNavItem[] = [
  { href: "/promax-admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/promax-admin/register-member", label: "Register Member", icon: <UserPlus className="h-4 w-4" /> },
  { href: "/promax-admin/add-points", label: "Add Points", icon: <WalletCards className="h-4 w-4" /> },
  { href: "/promax-admin/members", label: "Members & Wallets", icon: <Wallet className="h-4 w-4" /> },
  { href: "/promax-admin/impersonate", label: "Login as User", icon: <LogIn className="h-4 w-4" /> },
  { href: "/promax-admin/rewards", label: "Rewards", icon: <Trophy className="h-4 w-4" /> },
  { href: "/promax-admin/loans", label: "Loans", icon: <BadgeIndianRupee className="h-4 w-4" /> },
  { href: "/promax-admin/pins", label: "Generate Pins", icon: <Sparkles className="h-4 w-4" /> },
  { href: "/promax-admin/pin-requests", label: "Pin Requests", icon: <KeyRound className="h-4 w-4" /> },
  { href: "/promax-admin/genealogy", label: "Genealogy", icon: <GitBranch className="h-4 w-4" /> },
  { href: "/promax-admin/settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" /> },
];

export default async function ProMaxAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/promax-admin/login");
  if (session.user.role !== "PROMAX_ADMIN") redirect("/promax-admin/login");

  return (
    <DashboardShell title="Pro Max Admin" description="10,000-pt operations" nav={nav} variant="promax">
      {children}
    </DashboardShell>
  );
}
