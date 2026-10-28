"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PackagePlus, ArrowRightLeft } from "lucide-react";
import { formatPoints } from "@/lib/money";

export type PackageProductOption = { id: string; name: string; price: number };

export function PackagePurchaseForm({
  starterPoints,
  minPoints,
  bvPercent,
  products,
  defaults,
  hasPending,
}: {
  starterPoints: number;
  minPoints: number;
  bvPercent: number;
  products: PackageProductOption[]; // price in paise, sorted ascending
  defaults: { shipName: string; shipPhone: string; shipAddress: string };
  hasPending: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<"STARTER" | "CUSTOM">("STARTER");
  // Raw string so the field can be cleared and retyped freely.
  const [customPts, setCustomPts] = useState(String(minPoints));
  const [productId, setProductId] = useState("");
  const [shipName, setShipName] = useState(defaults.shipName);
  const [shipPhone, setShipPhone] = useState(defaults.shipPhone);
  const [shipAddress, setShipAddress] = useState(defaults.shipAddress);
  const [submitting, setSubmitting] = useState(false);

  const points = plan === "STARTER" ? starterPoints : parseInt(customPts, 10) || 0;
  const amountPaise = points * 100;
  const bv = Math.floor((points * bvPercent) / 100);
  const belowMin = points < minPoints;
  const eligible = useMemo(() => products.filter((p) => p.price <= amountPaise), [products, amountPaise]);
  const productValid = eligible.some((p) => p.id === productId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (belowMin || !productValid) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/affiliate/package/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          points: plan === "CUSTOM" ? points : undefined,
          productId,
          shipName,
          shipPhone,
          shipAddress,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      toast.success("Package request sent. An admin will verify and approve it.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (hasPending) {
    return (
      <div className="card p-5 text-sm text-muted-foreground">
        Your package request is awaiting admin verification. You can request another package once it&apos;s reviewed.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-brand-100 text-brand-700 grid place-items-center">
          <PackagePlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Request a package</h2>
          <p className="text-xs text-muted-foreground">Every package includes a product delivered to your address</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Package</label>
          <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as "STARTER" | "CUSTOM")}>
            <option value="STARTER">Starter package — {starterPoints} pts + product</option>
            <option value="CUSTOM">Custom points (min {minPoints} pts) + product</option>
          </select>
        </div>
        {plan === "CUSTOM" && (
          <div>
            <label className="label">Points</label>
            <input
              type="text"
              inputMode="numeric"
              className="input"
              value={customPts}
              onChange={(e) => setCustomPts(e.target.value.replace(/[^0-9]/g, ""))}
            />
            {belowMin && <p className="mt-1 text-xs text-red-600">Minimum is {minPoints} points.</p>}
          </div>
        )}
      </div>

      <div>
        <label className="label">Product to receive</label>
        <select className="input" value={productValid ? productId : ""} onChange={(e) => setProductId(e.target.value)}>
          <option value="">Select a product…</option>
          {eligible.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatPoints(p.price)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">Products priced up to your package points.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Receiver name</label>
          <input className="input" value={shipName} onChange={(e) => setShipName(e.target.value)} />
        </div>
        <div>
          <label className="label">Receiver mobile</label>
          <input className="input" inputMode="tel" value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Delivery address</label>
        <textarea className="input min-h-[80px]" value={shipAddress} onChange={(e) => setShipAddress(e.target.value)} />
      </div>

      <div className="rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 text-sm flex flex-wrap justify-between gap-2">
        <span>
          Package: <strong>{formatPoints(amountPaise)}</strong>
        </span>
        <span>
          Business Volume: <strong>{bv} BV</strong>
        </span>
      </div>

      <button
        type="submit"
        disabled={submitting || belowMin || !productValid}
        className="btn-primary w-full sm:w-auto"
      >
        {submitting ? "Sending…" : "Send for admin approval"}
      </button>
    </form>
  );
}

export function PackageTransferForm({ walletBalance }: { walletBalance: number }) {
  const router = useRouter();
  const [pts, setPts] = useState("");
  const [busy, setBusy] = useState(false);
  const n = parseInt(pts, 10) || 0;
  const valid = n >= 100 && n * 100 <= walletBalance;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const res = await fetch("/api/affiliate/package/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: n }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Transfer failed");
      toast.success(`Moved ${n.toLocaleString("en-IN")} points to your e-wallet.`);
      setPts("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
          <ArrowRightLeft className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Move earnings to e-wallet</h2>
          <p className="text-xs text-muted-foreground">Minimum 100 pts · available {formatPoints(walletBalance)}</p>
        </div>
      </div>
      <input
        type="text"
        inputMode="numeric"
        className="input"
        placeholder="Points"
        value={pts}
        onChange={(e) => setPts(e.target.value.replace(/[^0-9]/g, ""))}
      />
      <button type="submit" disabled={busy || !valid} className="btn-primary w-full">
        {busy ? "Moving…" : "Move to e-wallet"}
      </button>
    </form>
  );
}
