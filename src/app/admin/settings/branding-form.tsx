"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";

const MAX_BYTES = 500 * 1024; // 500 KB cap; bigger images bloat every HTML response
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function BrandingForm({
  initial,
}: {
  initial: { logoUrl: string | null; siteName: string; tagline: string; amazonAffiliateUrl: string };
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [siteName, setSiteName] = useState(initial.siteName);
  const [tagline, setTagline] = useState(initial.tagline);
  const [amazonAffiliateUrl, setAmazonAffiliateUrl] = useState(initial.amazonAffiliateUrl);
  const [saving, setSaving] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Logo must be PNG, JPG, WEBP or SVG");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Logo must be under 500 KB");
      e.target.value = "";
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setLogoUrl(dataUrl);
    e.target.value = "";
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    const res = await fetch("/api/admin/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl, siteName, tagline, amazonAffiliateUrl: amazonAffiliateUrl.trim() }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error || "Save failed");
      return;
    }
    toast.success("Branding updated");
    router.refresh();
  }

  return (
    <div className="card p-5 space-y-5">
      <div>
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-brand-600" /> Branding
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Replace the default leaf mark with your own logo image. Used in the site header, footer and landing page.
        </p>
      </div>

      <div>
        <label className="label">Logo</label>
        <div className="flex items-center gap-4 mt-1">
          <div className="h-20 w-20 grid place-items-center rounded-xl border bg-slate-50 overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo preview" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">No logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept={ACCEPTED.join(",")} className="hidden" onChange={onFile} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-brand-700 hover:bg-brand-800 text-white"
            >
              <Upload className="h-3.5 w-3.5" /> Upload logo
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl(null)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-white text-red-700 border border-red-300 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove (use default)
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          PNG, JPG, WEBP or SVG. Max 500 KB. Square or wide formats both work; the logo is rendered with object-fit: contain.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Site name</label>
          <input className="input" value={siteName} onChange={(e) => setSiteName(e.target.value)} maxLength={80} />
        </div>
        <div>
          <label className="label">Tagline</label>
          <input className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} />
        </div>
      </div>

      <div>
        <label className="label">Amazon affiliate link (blog)</label>
        <input
          className="input font-mono text-xs"
          value={amazonAffiliateUrl}
          onChange={(e) => setAmazonAffiliateUrl(e.target.value)}
          placeholder="https://amzn.to/…"
          maxLength={500}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Your Amazon Associates / SiteStripe link. Shown as a &ldquo;Shop on Amazon&rdquo; button on every blog post.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save branding"}
        </button>
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
