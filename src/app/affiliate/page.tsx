import Link from "next/link";
import { Leaf, CheckCircle2, XCircle, Users, Gift } from "lucide-react";

export const metadata = { title: "Points Program" };

const REWARD_TIERS: { level: number; reward: string }[] = [
  { level: 1, reward: "Welcome Kit" },
  { level: 2, reward: "Product 1" },
  { level: 3, reward: "Product 2" },
  { level: 4, reward: "Product 2" },
  { level: 5, reward: "Product 2" },
  { level: 6, reward: "Product 5" },
  { level: 7, reward: "Power Bank" },
  { level: 8, reward: "Air Buds" },
  { level: 9, reward: "Mobile (10K class)" },
  { level: 10, reward: "Laptop (20K class)" },
  { level: 11, reward: "Two-Wheeler (1 Lakh class)" },
  { level: 12, reward: "Car (3 Lakh class)" },
  { level: 13, reward: "Gold (5 Lakh class)" },
  { level: 14, reward: "House (20 Lakh class)" },
  { level: 15, reward: "Villa + Gold + Luxury Car (1 Crore class)" },
];

export default function AffiliatePublicPage() {
  return (
    <div>
      <section className="bg-brand-950 text-white">
        <div className="container py-16 md:py-20 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-700/40 px-3 py-1 text-xs font-semibold text-brand-100 mb-4">
            <Users className="h-3.5 w-3.5" /> ACHT MART Points Program
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Build your binary tree. Earn points. Unlock gifts.
          </h1>
          <p className="text-lg text-brand-200">
            Refer two people — your Left and Right. As your tree grows below
            you, you accumulate points. High point milestones unlock physical
            reward gifts. <strong>Points only — no money is involved.</strong>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn bg-white text-brand-900 hover:bg-brand-50 px-6 py-3">
              Member Login
            </Link>
            <Link href="/contact" className="btn border border-white/30 text-white hover:bg-white/10 px-6 py-3">
              Request a membership pin
            </Link>
          </div>
          <p className="text-xs text-brand-300 mt-3">
            New members join via an invitation pin issued by an existing member or by ACHT MART admin.
          </p>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-3xl font-bold text-center">How the binary tree works</h2>
        <p className="text-muted-foreground text-center mt-2 max-w-2xl mx-auto">
          Each member has exactly two slots: a <strong>Left</strong> and a
          <strong> Right</strong>. You earn points for direct referrals you place,
          and for every <em>pair match</em> in your downline — i.e. whenever your
          Left and Right legs grow in step.
        </p>
        <div className="mt-10 grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <LevelCard
            level="Direct referral"
            rate="+200"
            description="Every member you personally place below you (Left or Right) credits you with 200 points."
            example="You refer 2 people → +400 points"
          />
          <LevelCard
            level="First-pair bonus"
            rate="+500"
            description="The first time both your Left and Right slots are filled, you receive a one-time 500-point bonus."
            example="Left + Right both filled → +500 once"
          />
          <LevelCard
            level="Pair match"
            rate="+200 / +100"
            description="Every additional pair formed in your downline pays 200 points if the joiner is within 15 levels below you, or 100 points if at level 16+."
            example="Both legs grow by 1 → +200 (or +100 deep)"
          />
        </div>
      </section>

      <section className="bg-muted/40 border-y">
        <div className="container py-16">
          <h2 className="text-3xl font-bold text-center mb-2">Reward gifts by level</h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            When your tree fills to a given depth, the corresponding gift is unlocked.
            Gifts are dispatched after the level is verified at the daily cutoff.
          </p>
          <div className="max-w-3xl mx-auto card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-5 py-3 font-semibold">Level</th>
                  <th className="px-5 py-3 font-semibold">Tree members at this level</th>
                  <th className="px-5 py-3 font-semibold">Reward gift</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {REWARD_TIERS.map((t) => (
                  <tr key={t.level}>
                    <td className="px-5 py-3 font-mono">{t.level}</td>
                    <td className="px-5 py-3 font-mono">{(2 ** t.level).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 flex items-center gap-2">
                      <Gift className="h-4 w-4 text-brand-700 shrink-0" />
                      {t.reward}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Rules — read these</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="card p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3 text-brand-700">
              <CheckCircle2 className="h-5 w-5" /> What this program IS
            </h3>
            <ul className="space-y-2 text-sm">
              <Yes><strong>Points only.</strong> Points are an internal loyalty unit.</Yes>
              <Yes>Each member has a Left and a Right slot — binary structure.</Yes>
              <Yes>+200 points per direct referral you place.</Yes>
              <Yes>+500 one-time bonus the first time you fill both Left and Right.</Yes>
              <Yes>+200 per pair-match in your downline (100 points at level 16 and below).</Yes>
              <Yes>Daily cutoff: tree state and gift eligibility are evaluated once per day.</Yes>
              <Yes>You may leave at any time.</Yes>
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-3 text-red-700">
              <XCircle className="h-5 w-5" /> What this program IS NOT
            </h3>
            <ul className="space-y-2 text-sm">
              <No><strong>No money is paid or received as part of points.</strong> Points have zero cash value.</No>
              <No>Points cannot be exchanged for cash, transferred, or converted to rupees.</No>
              <No>This is not a loan product, an investment scheme, or a money-circulation arrangement.</No>
              <No>No guaranteed income or return is promised at any level.</No>
              <No>No points for un-matched legs — a side that has no activity on the opposite side does not produce pair-match credit.</No>
              <No>Points are forfeited on account closure. Delivered gifts are yours to keep.</No>
            </ul>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Three steps to start</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Step n={1} title="Get your pin" desc="Receive a one-time membership pin from your sponsor or ACHT MART admin." />
          <Step n={2} title="Refer two" desc="Fill your Left and Right slots. They each fill theirs, and so on." />
          <Step n={3} title="Unlock gifts" desc="As your tree grows, points accumulate. Hit a milestone, get the gift." />
        </div>
        <div className="text-center mt-10">
          <Link href="/contact" className="btn-primary px-8 py-3 text-base">
            <Leaf className="h-4 w-4" /> Request a membership pin
          </Link>
        </div>
      </section>
    </div>
  );
}

function LevelCard({ level, rate, description, example }: { level: string; rate: string; description: string; example: string }) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex justify-between items-start gap-3">
        <h3 className="font-semibold">{level}</h3>
        <span className="text-2xl sm:text-3xl font-bold text-brand-700 whitespace-nowrap">{rate}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
      <p className="text-xs bg-muted rounded-md px-3 py-2 mt-3 font-mono break-words">{example}</p>
    </div>
  );
}
function Yes({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
function No({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="card p-6 text-center">
      <div className="h-12 w-12 mx-auto rounded-full bg-brand-100 text-brand-700 grid place-items-center font-bold text-lg">{n}</div>
      <h3 className="font-semibold mt-3">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
