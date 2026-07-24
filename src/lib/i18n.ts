import type { Language } from "@prisma/client";

// The member-selectable display languages for product names. Mirrors the
// Prisma `Language` enum. EN is the default and the universal fallback.
export type Lang = Language; // "EN" | "TA" | "HI"

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: "EN", label: "English", native: "English" },
  { code: "TA", label: "Tamil", native: "தமிழ்" },
  { code: "HI", label: "Hindi", native: "हिन्दी" },
];

export function isLang(v: unknown): v is Lang {
  return v === "EN" || v === "TA" || v === "HI";
}

// A product-shaped object carrying the English name plus optional localized
// names. Anything with these fields (a full Product, a `select`ed subset, or an
// order item's joined product) works.
export type LocalizableProduct = {
  name: string;
  nameTa?: string | null;
  nameHi?: string | null;
};

// Resolve the display name for a member's language, falling back to English
// whenever the localized name is missing/blank.
export function productName(p: LocalizableProduct, lang: Lang): string {
  if (lang === "TA") return p.nameTa?.trim() || p.name;
  if (lang === "HI") return p.nameHi?.trim() || p.name;
  return p.name;
}

// ---- Automatic language from delivery region -------------------------------
// The Hindi-belt states — a member whose delivery address is in one of these
// gets Hindi by default. Tamil Nadu gets Tamil. Everyone else defaults to
// English. All matching is case-insensitive and tolerant of extra words.
const HINDI_BELT = [
  "uttar pradesh", "bihar", "madhya pradesh", "rajasthan", "delhi",
  "haryana", "jharkhand", "chhattisgarh", "chattisgarh", "uttarakhand",
  "uttaranchal", "himachal pradesh",
];

// Derive a language from a delivery-address state name.
export function languageForState(state?: string | null): Lang {
  if (!state) return "EN";
  const s = state.trim().toLowerCase();
  if (!s) return "EN";
  if (s.includes("tamil")) return "TA"; // "Tamil Nadu" / "Tamilnadu"
  if (HINDI_BELT.some((h) => s.includes(h))) return "HI";
  return "EN";
}

// The language actually used to display product names: the member's manual
// choice when they've set one, otherwise auto-derived from their region.
export function effectiveLanguage(
  u: { preferredLanguage: Lang; languageIsManual: boolean },
  addressState?: string | null,
): Lang {
  return u.languageIsManual ? u.preferredLanguage : languageForState(addressState);
}

// The value shown as "selected" in a language picker: an explicit language when
// manual, or the sentinel "AUTO" when following the region.
export type LangChoice = Lang | "AUTO";
export function currentChoice(u: { preferredLanguage: Lang; languageIsManual: boolean }): LangChoice {
  return u.languageIsManual ? u.preferredLanguage : "AUTO";
}
