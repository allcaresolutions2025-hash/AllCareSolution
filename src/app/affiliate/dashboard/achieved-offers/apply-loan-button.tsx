"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { BadgeIndianRupee, MessageCircle, X } from "lucide-react";

export function ApplyLoanButton({
  tierKey,
  amountLabel,
  registeredPhone,
  savedWhatsappNumber,
}: {
  tierKey: string;
  amountLabel: string;
  registeredPhone: string | null;
  savedWhatsappNumber: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Prefer saved whatsapp > registered phone > empty
  const initial = (savedWhatsappNumber || registeredPhone || "").replace(/\D/g, "").slice(-10);
  const [waNumber, setWaNumber] = useState(initial);

  useEffect(() => {
    if (open) setWaNumber(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    if (busy) return;
    if (!/^[6-9][0-9]{9}$/.test(waNumber)) {
      toast.error("Enter a valid 10-digit WhatsApp number");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/affiliate/loan/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierKey, whatsappNumber: waNumber }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Could not submit loan request");
      return;
    }
    setOpen(false);
    toast.success("Loan request submitted. Awaiting admin approval.");
    router.refresh();
    router.push("/affiliate/dashboard/loan");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
      >
        <BadgeIndianRupee className="h-4 w-4" />
        Apply for {amountLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => !busy && setOpen(false)}>
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg">Apply for {amountLabel}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Admin will verify and disburse offline. We&apos;ll contact you on WhatsApp for repayment reminders.
                </p>
              </div>
              <button
                onClick={() => !busy && setOpen(false)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="label flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  WhatsApp number <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  className="input font-mono"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit WhatsApp number"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  We use this <strong>only</strong> for loan repayment reminders. Make sure WhatsApp is installed on this number.
                </p>
                {registeredPhone && registeredPhone !== waNumber && (
                  <button
                    type="button"
                    onClick={() => setWaNumber(registeredPhone.replace(/\D/g, "").slice(-10))}
                    className="mt-2 text-xs text-brand-700 hover:text-brand-900 font-medium"
                  >
                    Same as registered phone ({registeredPhone}) →
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 border-t flex items-center justify-end gap-2 bg-muted/30">
              <button
                onClick={() => !busy && setOpen(false)}
                disabled={busy}
                className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
              >
                <BadgeIndianRupee className="h-4 w-4" />
                {busy ? "Submitting…" : `Apply for ${amountLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
