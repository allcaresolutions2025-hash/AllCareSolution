import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard-shell";
import { LayoutDashboard, GitFork, KeyRound, ListChecks, UserPlus, Trophy, WalletCards, Settings as SettingsIcon } from "lucide-react";

// Pro Max member portal (violet). Separate login + separate accounts — only
// Pro Max members reach this subtree (also enforced in middleware).
const nav: DashboardNavItem[] = [
  { href: "/promax/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/promax/dashboard/tree", label: "Genealogy", icon: <GitFork className="h-4 w-4" /> },
  { href: "/promax/dashboard/rewards", label: "My Rewards", icon: <Trophy className="h-4 w-4" /> },
  { href: "/promax/dashboard/pin-wallet", label: "Pin Wallet", icon: <WalletCards className="h-4 w-4" /> },
  { href: "/promax/dashboard/request-pin", label: "Request Pin", icon: <KeyRound className="h-4 w-4" /> },
  { href: "/promax/dashboard/pin-status", label: "Pin Status", icon: <ListChecks className="h-4 w-4" /> },
  { href: "/promax/dashboard/add-member", label: "Add Member", icon: <UserPlus className="h-4 w-4" /> },
  { href: "/promax/dashboard/settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" /> },
];

export default async function ProMaxDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/promax/login");
  if (!session.user.isProMax) redirect("/");

  return (
    <DashboardShell title="Pro Max Center" description="10,000-pt programme" nav={nav} variant="promax">
      {children}
    </DashboardShell>
  );
}
