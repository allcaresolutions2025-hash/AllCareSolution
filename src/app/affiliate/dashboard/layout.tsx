import { DashboardShell } from "@/components/dashboard-shell";
import { BreakingNewsTicker } from "@/components/breaking-news-ticker";
import { LayoutDashboard, FileCheck2, Wallet, Network, Share2, Award, KeyRound, UserPlus, ListChecks, Settings as SettingsIcon, BadgeIndianRupee, Coins, Megaphone, Trophy, Smartphone, WalletCards, Crown } from "lucide-react";

const nav = [
  { href: "/affiliate/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/news", label: "News", icon: <Megaphone className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/rewards", label: "My Rewards", icon: <Trophy className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/referrals", label: "Genealogy", icon: <Network className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/request-pin", label: "Request Pin", icon: <KeyRound className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/pin-status", label: "Pin Status", icon: <ListChecks className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/pin-wallet", label: "Pin Wallet", icon: <WalletCards className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/pin-pro-max", label: "Pin Pro Max", icon: <Crown className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/add-member", label: "Add Member", icon: <UserPlus className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/commissions", label: "Commissions", icon: <Wallet className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/share", label: "Share & Earn", icon: <Share2 className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/kyc", label: "KYC", icon: <FileCheck2 className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/achieved-offers", label: "Achieved Offers", icon: <Award className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/loan", label: "My Loan", icon: <BadgeIndianRupee className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/daily-payouts", label: "Daily Payouts", icon: <Coins className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/download", label: "Mobile App", icon: <Smartphone className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" /> },
];

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreakingNewsTicker />
      <DashboardShell title="Affiliate Center" description="Track your earnings & payouts" nav={nav}>
        {children}
      </DashboardShell>
    </>
  );
}
