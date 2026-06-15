import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "./db";

const BRAND_CACHE_TAG = "site-brand";

// Branding settings live in the same Setting table as everything else, keyed
// by string. Stored as a single data URL (or external https URL). Reading is
// server-only; for the client we pass the resolved URL down from a server
// component as a prop.

const LOGO_KEY = "site_logo_url";
const SITE_NAME_KEY = "site_name";
const SITE_TAGLINE_KEY = "site_tagline";

// Default to the static logo bundled in /public — admin can still override
// this via /admin/settings → Branding (upload your own).
export const DEFAULT_LOGO_URL = "/acht-mart-logo.png";

export type SiteBrand = {
  logoUrl: string;            // resolved URL (admin upload OR the bundled default)
  isCustomLogo: boolean;      // true when admin has uploaded their own
  siteName: string;           // defaults to "ACHT MART"
  tagline: string;            // defaults to "Pure Nature, Pure Wellness"
};

// Cached on the Vercel data layer for 5 minutes (or until the admin saves
// branding, which calls revalidateTag below). Branding changes maybe once a
// month; this turns 3 DB calls per page navigation into ~1 per 5 minutes.
export const getSiteBrand = unstable_cache(
  async (): Promise<SiteBrand> => {
    try {
      const rows = await prisma.setting.findMany({
        where: { key: { in: [LOGO_KEY, SITE_NAME_KEY, SITE_TAGLINE_KEY] } },
        select: { key: true, value: true },
      });
      const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
      const uploaded = byKey[LOGO_KEY] || "";
      return {
        logoUrl: uploaded || DEFAULT_LOGO_URL,
        isCustomLogo: !!uploaded,
        siteName: byKey[SITE_NAME_KEY] || "ACHT MART",
        tagline: byKey[SITE_TAGLINE_KEY] || "Pure Nature, Pure Wellness",
      };
    } catch {
      // DB not ready yet (e.g. migrations pending) — return safe defaults.
      return {
        logoUrl: DEFAULT_LOGO_URL,
        isCustomLogo: false,
        siteName: "ACHT MART",
        tagline: "Pure Nature, Pure Wellness",
      };
    }
  },
  ["site-brand"],
  { revalidate: 300, tags: [BRAND_CACHE_TAG] },
);

// Updates are nullable strings: null/"" clears the override and reverts to
// defaults (DEFAULT_LOGO_URL for the logo). undefined means "don't touch".
export type SiteBrandUpdate = {
  logoUrl?: string | null;
  siteName?: string | null;
  tagline?: string | null;
};

export async function setSiteBrand(updates: SiteBrandUpdate): Promise<void> {
  const mapping: Array<[string, string | null | undefined]> = [
    [LOGO_KEY, updates.logoUrl],
    [SITE_NAME_KEY, updates.siteName],
    [SITE_TAGLINE_KEY, updates.tagline],
  ];
  for (const [key, value] of mapping) {
    if (value === undefined) continue;
    if (value === null || value === "") {
      await prisma.setting.deleteMany({ where: { key } });
    } else {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  }
  // Bust the cached brand so admin changes show on the very next request.
  revalidateTag(BRAND_CACHE_TAG);
}
