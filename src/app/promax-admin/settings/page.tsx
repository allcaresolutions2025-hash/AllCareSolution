import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LoginPasswordForm } from "@/app/affiliate/dashboard/settings/login-password-form";
import {
  PROMAX_POINTS_PER_DIRECT_REFERRAL,
  PROMAX_FIRST_PAIR_BONUS,
  PROMAX_PAIR_MATCH_POINTS_NEAR,
  PROMAX_PAIR_MATCH_POINTS_FAR,
  PROMAX_PAIR_MATCH_DEPTH_THRESHOLD,
} from "@/lib/points-promax";
import { Settings as SettingsIcon, Coins } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Settings" };

export default async function ProMaxAdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });

  const rules: { label: string; value: string }[] = [
    { label: "Direct referral (each side)", value: `+${PROMAX_POINTS_PER_DIRECT_REFERRAL.toLocaleString("en-IN")}` },
    { label: "First-pair bonus (both legs fill)", value: `+${PROMAX_FIRST_PAIR_BONUS.toLocaleString("en-IN")}` },
    { label: `Pair match (within ${PROMAX_PAIR_MATCH_DEPTH_THRESHOLD} levels)`, value: `+${PROMAX_PAIR_MATCH_POINTS_NEAR.toLocaleString("en-IN")}` },
    { label: `Pair match (beyond ${PROMAX_PAIR_MATCH_DEPTH_THRESHOLD} levels)`, value: `+${PROMAX_PAIR_MATCH_POINTS_FAR.toLocaleString("en-IN")}` },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-promax-600" /> Pro Max Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Programme configuration and your admin account security.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b flex items-center gap-2">
          <Coins className="h-4 w-4 text-promax-700" />
          <h2 className="font-semibold">Points rules</h2>
        </div>
        <div className="divide-y">
          {rules.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-semibold tabular-nums text-promax-700">{r.value}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 text-xs text-muted-foreground bg-muted/30">
          A leader with both directs + first pair earns 6,000. These values live in
          <code className="mx-1">src/lib/points-promax.ts</code>.
        </div>
      </div>

      {me && <LoginPasswordForm mustChange={me.mustChangePassword} />}
    </div>
  );
}
