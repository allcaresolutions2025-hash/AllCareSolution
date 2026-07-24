"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Languages, Check } from "lucide-react";
import { LANGUAGES, type Lang } from "@/lib/i18n";

// Lets a member choose the language product names appear in across the shop and
// their orders. Saved to their profile; English is the default.
export function LanguageForm({ initial }: { initial: Lang }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(initial);
  const [saving, setSaving] = useState(false);

  async function choose(next: Lang) {
    if (next === lang || saving) return;
    const prev = lang;
    setLang(next);
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
      setLang(prev);
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
            Choose the language for product names in the shop and your orders.
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {LANGUAGES.map((l) => {
          const active = l.code === lang;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => choose(l.code)}
              disabled={saving}
              className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition disabled:opacity-60 ${
                active ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200" : "hover:bg-muted"
              }`}
            >
              <span>
                <span className="block font-medium text-sm">{l.native}</span>
                <span className="block text-xs text-muted-foreground">{l.label}</span>
              </span>
              {active && <Check className="h-4 w-4 text-brand-600 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
