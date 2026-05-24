import { Leaf, Sparkles } from "lucide-react";

// Brand mark.
// Image mode: when imageUrl is provided, render the image at h-{size} w-auto
// (object-contain). Use this for the real ACHT MART logo which already
// contains the wordmark — callers should NOT also render <AchtMartWordmark>.
// SVG fallback mode: gradient leaf-in-square used only when no image is set.
//
// Sizes (image height / SVG box edge):
//   sm  → 32px  (compact chrome)
//   md  → 40px  (default — site header)
//   lg  → 64px  (section headers)
//   xl  → 96px  (hero showcase)

const SIZE = {
  sm: { box: "h-8 w-8 rounded-lg",     icon: "h-4 w-4",   accent: "h-2.5 w-2.5 -top-0.5 -right-0.5", img: "h-8" },
  md: { box: "h-10 w-10 rounded-xl",   icon: "h-5 w-5",   accent: "h-3 w-3 -top-1 -right-1",         img: "h-10" },
  lg: { box: "h-16 w-16 rounded-2xl",  icon: "h-8 w-8",   accent: "h-4 w-4 -top-1 -right-1",         img: "h-16" },
  xl: { box: "h-24 w-24 rounded-3xl",  icon: "h-12 w-12", accent: "h-6 w-6 -top-1.5 -right-1.5",     img: "h-24" },
} as const;

export function AchtMartLogo({
  size = "md",
  imageUrl,
  alt = "ACHT MART logo",
}: {
  size?: keyof typeof SIZE;
  imageUrl?: string | null;
  alt?: string;
}) {
  const d = SIZE[size];

  if (imageUrl) {
    // Plain image rendered at the requested height with auto width — works
    // for both square marks and wider logo-with-wordmark artwork.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={alt}
        className={`${d.img} w-auto object-contain`}
      />
    );
  }

  return (
    <span className={`relative inline-grid place-items-center ${d.box} bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white shadow-md shadow-brand-500/30`}>
      <Leaf className={`${d.icon} -rotate-12 drop-shadow-sm`} />
      <span className={`pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-white/25 via-transparent to-transparent`} />
      <span className={`absolute ${d.accent} grid place-items-center rounded-full bg-amber-400 text-amber-900 ring-2 ring-white shadow`}>
        <Sparkles className="h-2 w-2" strokeWidth={3} />
      </span>
    </span>
  );
}

// Text-only wordmark — render this ALONGSIDE the SVG fallback logo. Skip it
// when using an image logo that already has the company name baked in.
export function AchtMartWordmark({
  tagline = true,
  dark = false,
  siteName = "ACHT MART",
  taglineText = "Pure · Natural · Authentic",
}: {
  tagline?: boolean;
  dark?: boolean;
  siteName?: string;
  taglineText?: string;
}) {
  const parts = siteName.trim().split(/\s+/);
  const first = parts[0] ?? siteName;
  const rest = parts.slice(1).join(" ");
  return (
    <div className="flex flex-col leading-tight">
      <span className={`font-extrabold tracking-tight text-lg ${dark ? "text-white" : "text-brand-900"}`}>
        {first} {rest && <span className="text-brand-500">{rest}</span>}
      </span>
      {tagline && (
        <span className={`text-[10px] uppercase tracking-[0.18em] font-semibold ${dark ? "text-brand-300" : "text-muted-foreground"}`}>
          {taglineText}
        </span>
      )}
    </div>
  );
}
