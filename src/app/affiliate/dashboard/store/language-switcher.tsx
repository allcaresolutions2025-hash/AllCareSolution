"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Languages } from "lucide-react";
import { LANGUAGES, type Lang, type LangChoice } from "@/lib/i18n";

// Compact language picker for the Shop header, so members can switch the
// product-name language without visiting Settings. "Auto" follows their region.
export function ShopLanguageSwitcher({ initial, autoLang }: { initial: LangChoice; autoLang: Lang }) {
  const router = useRouter();
  const [choice, setChoice] = useState<LangChoice>(initial);
  const [saving, setSaving] = useState(false);

  const autoNative = LANGUAGES.find((l) => l.code === autoLang)?.native ?? "English";

  async function change(next: LangChoice) {
    const prev = choice;
    setChoice(next);
    setSaving(true);
    try {
      const res = await fetch("/api/affiliate/preferences/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setChoice(prev);
      toast.error("Could not change language");
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-white">
      <Languages className="h-4 w-4 text-brand-600 shrink-0" />
      <span className="text-muted-foreground hidden sm:inline">Language</span>
      <select
        value={choice}
        disabled={saving}
        onChange={(e) => change(e.target.value as LangChoice)}
        className="bg-transparent font-medium outline-none disabled:opacity-60"
        aria-label="Product name language"
      >
        <option value="AUTO">Auto ({autoNative})</option>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.native}</option>
        ))}
      </select>
    </label>
  );
}
