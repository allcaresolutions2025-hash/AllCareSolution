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
