"use client";

// Bank inputs shared by the three AF account-creation forms (AF member add,
// member AF ID request, admin approval). Validated server-side by afBankSchema.

export type AfBankValue = {
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
};

export function emptyAfBank(from?: Partial<Record<keyof AfBankValue, string | null>>): AfBankValue {
  return {
    bankAccountName: from?.bankAccountName ?? "",
    bankAccountNumber: from?.bankAccountNumber ?? "",
    bankIfsc: from?.bankIfsc ?? "",
    bankName: from?.bankName ?? "",
  };
}

export function AfBankFields({ value, onChange }: { value: AfBankValue; onChange: (v: AfBankValue) => void }) {
  const set = (k: keyof AfBankValue, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <label className="label">Bank account holder name</label>
        <input className="input" value={value.bankAccountName} onChange={(e) => set("bankAccountName", e.target.value)} required />
      </div>
      <div>
        <label className="label">Account number</label>
        <input
          className="input font-mono"
          inputMode="numeric"
          value={value.bankAccountNumber}
          onChange={(e) => set("bankAccountNumber", e.target.value.replace(/[^0-9]/g, "").slice(0, 18))}
          required
        />
      </div>
      <div>
        <label className="label">IFSC</label>
        <input
          className="input font-mono uppercase"
          placeholder="ABCD0123456"
          value={value.bankIfsc}
          onChange={(e) => set("bankIfsc", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))}
          required
        />
      </div>
      <div>
        <label className="label">Bank name</label>
        <input className="input" value={value.bankName} onChange={(e) => set("bankName", e.target.value)} required />
      </div>
    </div>
  );
}
