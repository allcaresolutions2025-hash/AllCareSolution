import { DashboardShell } from "@/components/dashboard-shell";
import { LayoutDashboard, ShoppingBag, MapPin, User, Network } from "lucide-react";

const nav = [
  { href: "/account", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/account/orders", label: "My Orders", icon: <ShoppingBag className="h-4 w-4" /> },
  { href: "/account/team", label: "My Team", icon: <Network className="h-4 w-4" /> },
  { href: "/account/addresses", label: "Addresses", icon: <MapPin className="h-4 w-4" /> },
  { href: "/account/profile", label: "Profile", icon: <User className="h-4 w-4" /> },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell title="My Account" nav={nav}>
      {children}
    </DashboardShell>
  );
}
