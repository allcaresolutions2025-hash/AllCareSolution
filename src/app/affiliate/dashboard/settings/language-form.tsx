"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Languages, Check } from "lucide-react";
import { LANGUAGES, type Lang, type LangChoice } from "@/lib/i18n";

// Lets a member choose the language product names appear in across the shop and
// their orders. "Auto" follows their delivery region; a specific language
// overrides it. Saved to their profile.
export function LanguageForm({ initial, autoLang }: { initial: LangChoice; autoLang: Lang }) {
  const router = useRouter();
  const [choice, setChoice] = useState<LangChoice>(initial);
  const [saving, setSaving] = useState(false);

  const autoLabel = LANGUAGES.find((l) => l.code === autoLang)?.native ?? "English";
  const options: { code: LangChoice; native: string; label: string }[] = [
    { code: "AUTO", native: "Auto", label: `Based on your area · ${autoLabel}` },
    ...LANGUAGES.map((l) => ({ code: l.code as LangChoice, native: l.native, label: l.label })),
  ];

  async function pick(next: LangChoice) {
    if (next === choice || saving) return;
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
      toast.success("Language updated");
      router.refresh();
    } catch {
      setChoice(prev);
      toast.error("Could not update language");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg grid place-items-center bg-brand-100 text-brand-700">
          <Languages className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">Display language</div>
          <div className="text-xs text-muted-foreground">
            Language for product names in the shop and your orders. You can also change it on the Shop page.
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((o) => {
          const active = o.code === choice;
          return (
            <button
              key={o.code}
              type="button"
              onClick={() => pick(o.code)}
              disabled={saving}
              className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition disabled:opacity-60 ${
                active ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200" : "hover:bg-muted"
              }`}
            >
              <span>
                <span className="block font-medium text-sm">{o.native}</span>
                <span className="block text-xs text-muted-foreground">{o.label}</span>
              </span>
              {active && <Check className="h-4 w-4 text-brand-600 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
