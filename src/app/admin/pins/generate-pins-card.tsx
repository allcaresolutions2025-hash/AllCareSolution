"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Sparkles, KeyRound, Copy, Check } from "lucide-react";

export function GeneratePinsCard() {
  const router = useRouter();
  const [owner, setOwner] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ ownerName: string; codes: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setIssued(null);
    const res = await fetch("/api/admin/pins/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerReferralCode: owner.trim().toUpperCase(),
        quantity: Number(quantity) || 1,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || "Could not generate pins");
      return;
    }
    setIssued({ ownerName: json.ownerName, codes: json.codes });
    toast.success(`Issued ${json.issued} pin${json.issued === 1 ? "" : "s"}`);
    router.refresh();
  }

  async function copyAll() {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card overflow-hidden border-2 border-dashed border-brand-300 bg-brand-50/30">
      <div className="p-5 border-b border-brand-200/60">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-brand-100 text-brand-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold flex items-center gap-2">Generate Pins (First-Time Onboarding)</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Mint brand-new ACTIVE pins and assign them to any existing member. The owner can use these
              pins immediately in <em>Affiliate → Add Member</em> to place new joiners. Use this for the
              very first members on the platform — once members start requesting pins themselves, use
              the regular review queue below instead.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="p-5 grid sm:grid-cols-[1fr_140px_auto] gap-3 items-end">
        <div>
          <label className="label">Owner Refer ID</label>
          <input
            required
            className="input font-mono uppercase"
            placeholder="AM12345678"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            pattern="^AM[0-9]{8}$"
            title="Format: AM followed by 8 digits"
          />
        </div>
        <div>
          <label className="label">Quantity</label>
          <input
            required
            type="number"
            min={1}
            max={100}
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" />
          {busy ? "Generating…" : "Generate pins"}
        </button>
      </form>

      {issued && (
        <div className="px-5 pb-5">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm font-semibold text-emerald-900">
                Issued {issued.codes.length} pin{issued.codes.length === 1 ? "" : "s"} to {issued.ownerName}
              </div>
              <button
                onClick={copyAll}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white border hover:bg-emerald-100"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy all"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {issued.codes.map((code) => (
                <code key={code} className="font-mono text-sm bg-white border rounded px-2.5 py-1.5 text-center">
                  {code}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
