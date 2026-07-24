import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PRO_MAX_ENABLED } from "@/lib/pro-max";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard-shell";
import { BreakingNewsTicker } from "@/components/breaking-news-ticker";
import { canRequestFranchise } from "@/lib/franchise";
import { LayoutDashboard, FileCheck2, Wallet, Network, Share2, Award, KeyRound, UserPlus, ListChecks, Settings as SettingsIcon, BadgeIndianRupee, Coins, Megaphone, Trophy, Smartphone, WalletCards, Crown, GitFork, HandCoins, Store, ShoppingBag } from "lucide-react";

const baseNav: DashboardNavItem[] = [
  { href: "/affiliate/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/news", label: "News", icon: <Megaphone className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/store", label: "Shop", icon: <ShoppingBag className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/rewards", label: "My Rewards", icon: <Trophy className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/referrals", label: "Genealogy", icon: <Network className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/request-pin", label: "Request Pin", icon: <KeyRound className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/pin-status", label: "Pin Status", icon: <ListChecks className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/pin-wallet", label: "Pin Wallet", icon: <WalletCards className="h-4 w-4" /> },
  // Pin Pro Max — disabled via PRO_MAX_ENABLED.
  { href: "/affiliate/dashboard/pin-pro-max", label: "Pin Pro Max", icon: <Crown className="h-4 w-4" />, proMax: true },
  { href: "/affiliate/dashboard/add-member", label: "Add Member", icon: <UserPlus className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/commissions", label: "Commissions", icon: <Wallet className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/share", label: "Share & Earn", icon: <Share2 className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/kyc", label: "KYC", icon: <FileCheck2 className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/achieved-offers", label: "Achieved Offers", icon: <Award className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/loan", label: "My Loan", icon: <BadgeIndianRupee className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/daily-payouts", label: "Daily Payouts", icon: <Coins className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/withdraw", label: "Withdraw", icon: <HandCoins className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/download", label: "Mobile App", icon: <Smartphone className="h-4 w-4" /> },
  { href: "/affiliate/dashboard/settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" /> },
];

// "Pro Max Tree" is a Pro-Max-only section — inserted after "Pin Pro Max".
const proMaxTreeItem: DashboardNavItem = {
  href: "/affiliate/dashboard/pro-max-tree",
  label: "Pro Max Tree",
  icon: <GitFork className="h-4 w-4" />,
};

export default async function AffiliateLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // Pro Max fully off → drop all Pro Max nav. (Flip PRO_MAX_ENABLED to restore.)
  let nav: DashboardNavItem[] = baseNav.filter((n) => PRO_MAX_ENABLED || !("proMax" in n && n.proMax));

  const me = session
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isProMax: true, isFranchise: true, leftLegCount: true, rightLegCount: true },
      })
    : null;

  if (PRO_MAX_ENABLED && me?.isProMax) {
    const i = nav.findIndex((n) => n.href === "/affiliate/dashboard/pin-pro-max");
    nav = [...nav.slice(0, i + 1), proMaxTreeItem, ...nav.slice(i + 1)];
  }

  // Franchise entry point: leaders get a direct door into their portal; everyone
  // else sees the request page only while they're still eligible to apply.
  if (me) {
    const franchiseItem: DashboardNavItem | null = me.isFranchise
      ? { href: "/franchise", label: "Login into Franchise", icon: <Store className="h-4 w-4" /> }
      : canRequestFranchise(me)
      ? { href: "/affiliate/dashboard/franchise", label: "Request Franchise", icon: <Store className="h-4 w-4" /> }
      : null;
    if (franchiseItem) {
      const i = nav.findIndex((n) => n.href === "/affiliate/dashboard/loan");
      nav = i >= 0
        ? [...nav.slice(0, i + 1), franchiseItem, ...nav.slice(i + 1)]
        : [...nav, franchiseItem];
    }
  }

  return (
    <>
      <BreakingNewsTicker />
      <DashboardShell title="Affiliate Center" description="Track your earnings & payouts" nav={nav}>
        {children}
      </DashboardShell>
    </>
  );
}
