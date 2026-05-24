"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Upload, FileCheck, X } from "lucide-react";

type Kyc = {
  panNumber: string | null;
  panName: string | null;
  productReceiptUrl: string | null;
} | null;

type BankInfo = {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export function KycForm({
  initial,
  bank,
  disabled,
}: {
  initial: Kyc;
  bank: BankInfo;
  disabled?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    panNumber: initial?.panNumber || "",
    panName: initial?.panName || "",
  });
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(
    initial?.productReceiptUrl || null
  );
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File too large — max 5 MB");
      e.target.value = "";
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP or PDF allowed");
      e.target.value = "";
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearFile() {
    setFileDataUrl(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileDataUrl) {
      toast.error("Please upload your product acknowledgement form");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/affiliate/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, productReceiptUrl: fileDataUrl }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (data.issues?.fieldErrors) {
        const fields = Object.entries(data.issues.fieldErrors as Record<string, string[]>)
          .map(([k, v]) => `${k}: ${v[0]}`)
          .join(" · ");
        toast.error(fields || data.error || "Validation failed");
      } else {
        toast.error(data.error || "Could not submit");
      }
      return;
    }
    toast.success("KYC submitted — under review");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Bank details — read-only from registration */}
      <div className="card p-6 space-y-4">
        <div>
          <h3 className="font-semibold">Bank details</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-filled from your registration. Contact support to update.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Account holder name</label>
            <input className="input bg-muted/40 cursor-not-allowed" value={bank.accountName} readOnly disabled />
          </div>
          <div>
            <label className="label">Bank name</label>
            <input className="input bg-muted/40 cursor-not-allowed" value={bank.bankName} readOnly disabled />
          </div>
          <div>
            <label className="label">Account number</label>
            <input className="input bg-muted/40 cursor-not-allowed font-mono" value={bank.accountNumber} readOnly disabled />
          </div>
          <div>
            <label className="label">IFSC code</label>
            <input className="input bg-muted/40 cursor-not-allowed font-mono" value={bank.ifsc} readOnly disabled />
          </div>
        </div>
      </div>

      {/* PAN details */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold">PAN details</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">PAN number</label>
            <input
              className="input uppercase"
              value={form.panNumber}
              onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
              maxLength={10}
              required
              disabled={disabled}
              placeholder="ABCDE1234F"
            />
          </div>
          <div>
            <label className="label">Name as per PAN</label>
            <input
              className="input"
              value={form.panName}
              onChange={(e) => setForm({ ...form, panName: e.target.value })}
              required
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Product acknowledgement form upload */}
      <div className="card p-6 space-y-3">
        <div>
          <h3 className="font-semibold">Product Acknowledgement Form</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload the signed acknowledgement form confirming receipt of your product.
            The form must carry your signature. Accepted: JPG, PNG, WebP, PDF · Max 5 MB.
          </p>
        </div>

        {fileDataUrl ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-brand-200 bg-brand-50">
            <FileCheck className="h-5 w-5 text-brand-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-800 truncate">
                {fileName || "Previously uploaded document"}
              </p>
              <p className="text-xs text-brand-600">Ready to submit</p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={clearFile}
                className="h-7 w-7 rounded-md grid place-items-center hover:bg-brand-100 text-brand-600 transition-colors shrink-0"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <label
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors
              ${disabled ? "opacity-60 cursor-not-allowed border-muted-foreground/30 bg-muted/20" : "border-brand-200 hover:border-brand-400 hover:bg-brand-50/50"}`}
          >
            <Upload className="h-8 w-8 text-brand-400" />
            <span className="text-sm font-medium text-brand-700">
              Click to upload acknowledgement form
            </span>
            <span className="text-xs text-muted-foreground">JPG · PNG · WebP · PDF · max 5 MB</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              onChange={handleFile}
              disabled={disabled}
            />
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={disabled || loading}
        className="btn-primary w-full"
      >
        {loading ? "Submitting…" : disabled ? "Already submitted" : "Submit for verification"}
      </button>
    </form>
  );
}
