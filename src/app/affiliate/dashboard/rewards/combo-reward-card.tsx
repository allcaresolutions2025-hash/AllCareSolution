import { CheckCircle2, Sparkles } from "lucide-react";

// Informational card shown to a member who was enrolled using a 2000-pt pin.
// The 2000 pts is credited to their payout wallet automatically at enrollment,
// so there's nothing to claim — this just records the "40 Combo Reward".
export function ComboRewardCard({ points }: { points: number }) {
  return (
    <div className="card p-5 border-2 border-violet-300 bg-gradient-to-br from-violet-50/60 to-white">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-violet-100 text-violet-700 grid place-items-center shrink-0 text-2xl">
            🎁
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Joining bonus
            </div>
            <div className="font-bold text-base leading-tight mt-0.5">40 Combo Reward</div>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              You were enrolled with a 2,000 pts pin, so{" "}
              <strong>{points.toLocaleString("en-IN")} pts</strong> were credited to your payout wallet.
              No action needed — you can withdraw them or let the daily payout collect them.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> Credited
          </div>
        </div>
      </div>
    </div>
  );
}
