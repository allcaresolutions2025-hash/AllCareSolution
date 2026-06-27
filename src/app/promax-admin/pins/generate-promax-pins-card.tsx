"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Sparkles, KeyRound, Copy, Check } from "lucide-react";

// Pro Max admin: mint ACTIVE Pro Max pins directly to a Pro Max member.
export function GenerateProMaxPinsCard() {
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
    const res = await fetch("/api/promax-admin/pins/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerReferralCode: owner.trim().toUpperCase(), quantity: Number(quantity) || 1 }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || "Could not generate pins");
      return;
    }
    setIssued({ ownerName: json.ownerName, codes: json.codes });
    toast.success(`Issued ${json.issued} Pro Max pin${json.issued === 1 ? "" : "s"}`);
    router.refresh();
  }

  async function copyAll() {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card overflow-hidden border-2 border-dashed border-promax-300 bg-promax-50/40">
      <div className="p-5 border-b border-promax-200/60">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-promax-100 text-promax-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Generate Pro Max Pins</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Mint brand-new ACTIVE Pro Max pins and assign them to a Pro Max member. The owner uses each
              pin in <em>Pro Max → Add Member</em> to place a new joiner into their tree.
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
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-promax-700 hover:bg-promax-800 text-white text-sm font-semibold disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" />
          {busy ? "Generating…" : "Generate pins"}
        </button>
      </form>

      {issued && (
        <div className="px-5 pb-5">
          <div className="rounded-lg border border-promax-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm font-semibold text-promax-900">
                Issued {issued.codes.length} pin{issued.codes.length === 1 ? "" : "s"} to {issued.ownerName}
              </div>
              <button
                onClick={copyAll}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-white border hover:bg-promax-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-promax-700" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy all"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {issued.codes.map((code) => (
                <code key={code} className="font-mono text-sm bg-promax-50 border border-promax-100 rounded px-2.5 py-1.5 text-center">
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
