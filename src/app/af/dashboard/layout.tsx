import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard-shell";
import { LayoutDashboard, PackagePlus, GitFork, UserPlus, HandCoins, ScrollText, Settings as SettingsIcon } from "lucide-react";

// AF Solution portal (gold). Separate login + separate accounts — only AF
// accounts reach this subtree (also enforced in middleware).
const nav: DashboardNavItem[] = [
  { href: "/af/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/af/dashboard/request-package", label: "Request Package", icon: <PackagePlus className="h-4 w-4" /> },
  { href: "/af/dashboard/tree", label: "AF Tree", icon: <GitFork className="h-4 w-4" /> },
  { href: "/af/dashboard/add-member", label: "Add AF Member", icon: <UserPlus className="h-4 w-4" /> },
  { href: "/af/dashboard/withdraw", label: "Withdraw", icon: <HandCoins className="h-4 w-4" /> },
  { href: "/af/dashboard/terms", label: "Terms & Conditions", icon: <ScrollText className="h-4 w-4" /> },
  { href: "/af/dashboard/settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" /> },
];

export default async function AfDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/af/login");
  if (!session.user.isAf) redirect("/");

  return (
    <DashboardShell title="AF Solution" description="Product packages & binary income" nav={nav} variant="af">
      {children}
    </DashboardShell>
  );
}
