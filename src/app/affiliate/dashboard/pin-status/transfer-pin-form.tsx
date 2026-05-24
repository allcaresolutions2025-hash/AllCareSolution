"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight, Lock } from "lucide-react";

export function TransferPinForm({ pins, myCode }: { pins: string[]; myCode: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recipientCode, setRecipientCode] = useState("");
  const [txnPassword, setTxnPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function toggle(code: string) {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelected(next);
  }
  function selectAll() {
    setSelected(new Set(pins));
  }
  function clear() {
    setSelected(new Set());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      toast.error("Select at least one pin");
      return;
    }
    if (!/^AM[0-9]{8}$/.test(recipientCode.toUpperCase())) {
      toast.error("Recipient must be an AM-prefixed ID");
      return;
    }
    if (recipientCode.toUpperCase() === myCode.toUpperCase()) {
      toast.error("Cannot transfer pins to yourself");
      return;
    }
    if (!txnPassword) {
      toast.error("Enter your transaction password");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/affiliate/pin-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pinCodes: Array.from(selected),
        recipientCode: recipientCode.toUpperCase(),
        transactionPassword: txnPassword,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Transfer failed");
      return;
    }
    toast.success(`Transferred ${data.transferred} pin${data.transferred === 1 ? "" : "s"} to ${recipientCode.toUpperCase()}`);
    setSelected(new Set());
    setRecipientCode("");
    setTxnPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Select pins to transfer</label>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={selectAll} className="text-brand-700 hover:underline">Select all</button>
            <span className="text-muted-foreground">·</span>
            <button type="button" onClick={clear} className="text-muted-foreground hover:underline">Clear</button>
          </div>
        </div>
        <div className="border rounded-lg max-h-56 overflow-y-auto divide-y">
          {pins.map((code) => (
            <label key={code} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(code)}
                onChange={() => toggle(code)}
              />
              <span className="font-mono">{code}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {selected.size} of {pins.length} pins selected.
        </p>
      </div>

      <div>
        <label className="label">Recipient member ID</label>
        <input
          className="input font-mono uppercase"
          value={recipientCode}
          onChange={(e) => setRecipientCode(e.target.value)}
          placeholder="AM12345678"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          The recipient must be a member somewhere in your downline.
        </p>
      </div>

      <div>
        <label className="label inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" /> Transaction password
        </label>
        <input
          type="password"
          className="input"
          value={txnPassword}
          onChange={(e) => setTxnPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" disabled={loading || selected.size === 0} className="btn-primary">
        {loading ? "Transferring…" : (
          <>Transfer {selected.size > 0 && `${selected.size} pin${selected.size === 1 ? "" : "s"}`} <ArrowRight className="h-4 w-4" /></>
        )}
      </button>
    </form>
  );
}
