import { DashboardShell } from "@/components/dashboard-shell";
import { LayoutDashboard, Package, ShoppingBag, Users, FileCheck2, Wallet, Settings, Network, KeyRound, BadgeIndianRupee, Coins } from "lucide-react";

const nav = [
  { href: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/admin/products", label: "Products", icon: <Package className="h-4 w-4" /> },
  { href: "/admin/orders", label: "Orders", icon: <ShoppingBag className="h-4 w-4" /> },
  { href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/network", label: "Network", icon: <Network className="h-4 w-4" /> },
  { href: "/admin/pins", label: "PIN Management", icon: <KeyRound className="h-4 w-4" /> },
  { href: "/admin/kyc", label: "KYC Reviews", icon: <FileCheck2 className="h-4 w-4" /> },
  { href: "/admin/loans", label: "Loan Approvals", icon: <BadgeIndianRupee className="h-4 w-4" /> },
  { href: "/admin/daily-payouts", label: "Daily Payouts", icon: <Coins className="h-4 w-4" /> },
  { href: "/admin/payouts", label: "Payouts", icon: <Wallet className="h-4 w-4" /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell title="Admin" description="ACHT MART operations" nav={nav}>
      {children}
    </DashboardShell>
  );
}
