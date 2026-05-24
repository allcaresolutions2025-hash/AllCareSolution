import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { getSiteBrand } from "@/lib/brand";
import { AchtMartLogo } from "@/components/acht-mart-logo";
import {
  Leaf,
  ShieldCheck,
  Truck,
  ArrowRight,
  Sparkles,
  Award,
  FlaskConical,
  Heart,
  Star,
  BadgeCheck,
  Mail,
  MapPin,
  ShoppingBag,
  Users,
  Gift,
  IndianRupee,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [brand, products] = await Promise.all([
    getSiteBrand(),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
  ]);

  return (
    <>
      {/* ============== UTILITY BAR ============== */}
      <div className="bg-brand-950 text-brand-100 text-xs">
        <div className="container py-2 flex items-center justify-between gap-4 flex-wrap">
          <span className="font-semibold">
            Authentic Ayurveda · <span className="text-amber-300">Made in India</span>
          </span>
          <div className="flex items-center gap-5">
            <a href="mailto:achtmarts2026@gmail.com" className="inline-flex items-center gap-1.5 hover:text-white">
              <Mail className="h-3 w-3" /> achtmarts2026@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-amber-50" aria-hidden />
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" aria-hidden />

        <div className="container relative py-14 md:py-20 grid lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
          {/* Left: copy */}
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-800 mb-5 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {brand.tagline}
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance text-brand-950 leading-[1.05]">
              {brand.siteName} — Authentic
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-emerald-700 bg-clip-text text-transparent">
                Ayurvedic Wellness
              </span>{" "}
              for Every Home
            </h1>

            <p className="mt-4 text-xl md:text-2xl font-bold text-amber-700">
              Looking for premium herbal wellness products?
            </p>

            <p className="mt-4 text-base md:text-lg text-slate-700 max-w-2xl leading-relaxed">
              Welcome to <strong>{brand.siteName}</strong>, your trusted partner for hand-crafted
              Ayurvedic and herbal wellness products. We manufacture every drop at our certified
              facility in <strong>Madurai, Tamil Nadu</strong>, using authentic Indian botanicals —
              Panch Tulsi, Moringa, Neem Giloy, Sea Buckthorn and more.
            </p>

            <p className="mt-3 text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
              Our products combine traditional formulations with rigorous lab testing, delivering
              authentic results you can trust. With Pan-India delivery, a 30-day buyback guarantee
              and an ethical points &amp; rewards program for our members, {brand.siteName} is built
              on transparency and care.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-semibold text-base px-6 py-3 shadow-md shadow-brand-600/30 transition"
              >
                <ShoppingBag className="h-5 w-5" /> Shop the Collection
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/affiliate"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border-2 border-brand-200 text-brand-900 font-semibold text-base px-6 py-3 hover:border-brand-400 transition"
              >
                <Users className="h-4 w-4" /> Join Rewards Program
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <Badge icon={<BadgeCheck className="h-4 w-4 text-emerald-600" />} text="Made in India" />
              <Badge icon={<FlaskConical className="h-4 w-4 text-sky-600" />} text="Lab-tested" />
              <Badge icon={<Truck className="h-4 w-4 text-amber-600" />} text="Pan-India shipping" />
              <Badge icon={<ShieldCheck className="h-4 w-4 text-rose-600" />} text="30-day buyback" />
            </div>
          </div>

          {/* Right: contact card with logo + 100% NATURAL seal */}
          <aside className="bg-white rounded-2xl shadow-2xl shadow-brand-900/15 border border-slate-100 overflow-hidden">
            <div className="relative bg-gradient-to-br from-brand-700 to-emerald-900 p-6 text-white">
              <div className="absolute top-3 right-3 grid place-items-center h-16 w-16 rounded-full bg-amber-400 text-amber-900 font-extrabold text-xs leading-tight text-center shadow-lg rotate-12">
                100%<br />NATURAL
              </div>
              <div className="bg-white rounded-xl px-4 py-3 inline-flex">
                <AchtMartLogo size="lg" imageUrl={brand.logoUrl} alt={`${brand.siteName} logo`} />
              </div>
              <p className="mt-4 text-sm text-brand-100">
                Talk to our team about our products, bulk orders, or how to become a member.
              </p>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <ContactRow icon={<Mail className="h-4 w-4" />} label="Email" value="achtmarts2026@gmail.com" href="mailto:achtmarts2026@gmail.com" />
              <ContactRow icon={<MapPin className="h-4 w-4" />} label="Visit" value="12/20, Soosainagar 3rd St, Vilangudi, Madurai 625018" />
            </div>
          </aside>
        </div>
      </section>

      {/* ============== TRUST METRICS STRIP ============== */}
      <section className="bg-white border-b">
        <div className="container py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <Metric value="100%" label="Authentic herbs" />
          <Metric value="100+" label="Products" />
          <Metric value="30 day" label="Buyback policy" />
          <Metric value="500 pts" label="Min payout" />
        </div>
      </section>

      {/* ============== WHY ACHT MART ============== */}
      <section className="container py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 uppercase tracking-wider">
            <Heart className="h-3.5 w-3.5" /> Why {brand.siteName}
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
            Wellness you can trust, sourced with respect.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every bottle is traceable from farm to shelf. We obsess over the details so you don&apos;t have to.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            tint="emerald"
            title="Authentic &amp; lab-tested"
            desc="Sourced from certified herbal farms across India. Every batch lab-verified for purity and potency."
          />
          <Feature
            icon={<Truck className="h-5 w-5" />}
            tint="sky"
            title="Fast Pan-India delivery"
            desc="Tracked shipping via leading couriers — typically 3 to 7 working days, anywhere in India."
          />
          <Feature
            icon={<Award className="h-5 w-5" />}
            tint="amber"
            title="Rewards as you refer"
            desc="Grow your network on Left &amp; Right. Earn points, unlock milestone gifts — up to 15 levels deep."
          />
          <Feature
            icon={<Leaf className="h-5 w-5" />}
            tint="rose"
            title="30-day buyback"
            desc="Not happy with a product? Send it back for a full refund within 30 days. No questions asked."
          />
        </div>
      </section>

      {/* ============== FEATURED PRODUCTS / SHOP ============== */}
      <section className="bg-slate-50 border-y">
        <div className="container py-16">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 uppercase tracking-wider">
                <ShoppingBag className="h-3.5 w-3.5" /> Shop Now
              </span>
              <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Featured products</h2>
              <p className="text-muted-foreground mt-1">
                Our most-loved herbal formulations — order online, delivered nationwide.
              </p>
            </div>
            <Link href="/products" className="text-brand-700 font-semibold hover:text-brand-900 flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="card p-8 text-center text-muted-foreground">
              No products yet. Run <code className="bg-muted px-2 py-0.5 rounded">npm run db:seed</code> to load the initial catalog.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="card overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all group bg-white"
                >
                  <div className="aspect-square bg-brand-50 overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {p.mrp > p.price && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">
                        Save {Math.round((1 - p.price / p.mrp) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1 text-amber-500 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                    </div>
                    <h3 className="font-semibold line-clamp-1">{p.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2.5em]">
                      {p.shortDesc}
                    </p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-lg font-bold text-brand-700">{formatINR(p.price)}</span>
                      {p.mrp > p.price && (
                        <span className="text-xs text-muted-foreground line-through">{formatINR(p.mrp)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============== HOW IT WORKS — SHOPPING ============== */}
      <section className="container py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 uppercase tracking-wider">
            <ShoppingBag className="h-3.5 w-3.5" /> How to Order
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Ordering is simple</h2>
          <p className="mt-3 text-muted-foreground">
            Browse, log in, confirm your address, and you&apos;re done. Orders are dispatched within
            48 hours and tracked all the way to your door.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-5">
          <Step n={1} title="Browse" desc="Explore our full range of Ayurvedic drops and wellness products." />
          <Step n={2} title="Log in" desc="Sign in to your member account — accounts are issued via membership pin." />
          <Step n={3} title="Confirm address" desc="We pre-fill your saved address — just confirm or edit it." />
          <Step n={4} title="Track delivery" desc="Order goes to admin instantly. Tracking and delivery date update shortly." />
        </div>
      </section>

      {/* ============== REWARDS / POINTS CTA ============== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-emerald-950 text-white">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" aria-hidden />

        <div className="container relative py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider mb-5">
              <IndianRupee className="h-3.5 w-3.5 text-amber-300" /> Earn With Us
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight mb-5">
              Grow your tree.
              <br />
              <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                Earn real rewards.
              </span>
            </h2>
            <p className="text-brand-200 text-lg max-w-prose mb-6">
              Place one direct on your <strong className="text-white">Left</strong> and one on your{" "}
              <strong className="text-white">Right</strong>. As your team grows, you earn points across
              up to 15 levels of depth — unlocking welcome gifts, gadgets, vehicles and beyond.
            </p>
            <ul className="space-y-2 text-brand-200 text-sm mb-6">
              <Bullet>+200 points for every direct referral you place</Bullet>
              <Bullet>+500 one-time bonus the first time both Left &amp; Right are filled</Bullet>
              <Bullet>+200 per pair-match in your downline (up to 15 levels deep)</Bullet>
              <Bullet>Daily payout at 12:00 AM IST · minimum 500 pts</Bullet>
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/affiliate"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold px-6 py-3 transition shadow-lg shadow-amber-500/30"
              >
                <Gift className="h-4 w-4" />
                See the rewards ladder <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 text-white font-semibold px-6 py-3 transition"
              >
                Member Login
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <BigStat label="Direct slots" value="L + R" />
            <BigStat label="Tree depth" value="15 levels" />
            <BigStat label="Min payout" value="500 pts" />
            <BigStat label="Daily payouts" value="90%" />
          </div>
        </div>
      </section>

      {/* ============== TESTIMONIALS ============== */}
      <section className="container py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 uppercase tracking-wider">
            <Star className="h-3.5 w-3.5 fill-current" /> What our customers say
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Trusted by families across India</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <Testimonial
            name="Priya S."
            city="Bengaluru"
            quote="The Panch Tulsi drops have become part of my morning routine. Authentic taste, real results — and the delivery was prompt."
          />
          <Testimonial
            name="Rahul P."
            city="Ahmedabad"
            quote="Loved the Sea Buckthorn formulation. Packaging is clean, ingredients are clearly listed, and customer support replied within hours."
          />
          <Testimonial
            name="Anjali V."
            city="Kolkata"
            quote="Joined the rewards program last month. The team structure is transparent — I can see exactly how points are earned. Highly recommend."
          />
        </div>
      </section>
    </>
  );
}

/* -------------------- subcomponents -------------------- */

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
      {icon} {text}
    </span>
  );
}

function ContactRow({
  icon, label, value, href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand-700 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-semibold text-slate-800 truncate">{value}</div>
      </div>
    </div>
  );
  return href ? <a href={href} className="block hover:bg-brand-50/50 -mx-2 px-2 py-1 rounded">{inner}</a> : <div>{inner}</div>;
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-extrabold text-brand-700">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition">
      <div className="text-2xl md:text-3xl font-extrabold">{value}</div>
      <div className="text-xs text-brand-300 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Feature({
  icon, tint, title, desc,
}: {
  icon: React.ReactNode;
  tint: "emerald" | "sky" | "amber" | "rose";
  title: string;
  desc: string;
}) {
  const tints = {
    emerald: "bg-emerald-100 text-emerald-700",
    sky: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <div className="card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className={`h-11 w-11 rounded-xl ${tints[tint]} grid place-items-center mb-4`}>{icon}</div>
      <h3 className="font-bold text-base" dangerouslySetInnerHTML={{ __html: title }} />
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: desc }} />
    </div>
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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function Testimonial({ name, city, quote }: { name: string; city: string; quote: string }) {
  return (
    <figure className="card p-6 bg-white">
      <div className="flex items-center gap-1 text-amber-500 mb-3">
        {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
      </div>
      <blockquote className="text-sm text-slate-700 leading-relaxed">&ldquo;{quote}&rdquo;</blockquote>
      <figcaption className="mt-4 text-xs font-semibold text-slate-800">
        {name} <span className="text-muted-foreground font-normal">· {city}</span>
      </figcaption>
    </figure>
  );
}
