"use client";

// Personal-detail inputs shared by the three AF account-creation forms (AF
// member add, member AF ID request, admin approval). Validated server-side by
// afProfileSchema.

export type AfProfileValue = {
  nominee: string;
  gender: "" | "MALE" | "FEMALE";
  address: string;
  panNumber: string;
};

export function emptyAfProfile(from?: {
  nominee?: string | null;
  gender?: "MALE" | "FEMALE" | null;
  address?: string | null;
  panNumber?: string | null;
}): AfProfileValue {
  return {
    nominee: from?.nominee ?? "",
    gender: from?.gender ?? "",
    address: from?.address ?? "",
    panNumber: from?.panNumber ?? "",
  };
}

export function AfProfileFields({ value, onChange }: { value: AfProfileValue; onChange: (v: AfProfileValue) => void }) {
  const set = <K extends keyof AfProfileValue>(k: K, v: AfProfileValue[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <label className="label">PAN</label>
        <input
          className="input font-mono uppercase"
          placeholder="ABCDE1234F"
          value={value.panNumber}
          onChange={(e) => set("panNumber", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
          required
        />
      </div>
      <div>
        <label className="label">Gender</label>
        <select
          className="input"
          value={value.gender}
          onChange={(e) => set("gender", e.target.value as AfProfileValue["gender"])}
          required
        >
          <option value="">Choose gender</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Nominee</label>
        <input className="input" value={value.nominee} onChange={(e) => set("nominee", e.target.value)} required />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Address</label>
        <textarea
          className="input min-h-[72px]"
          value={value.address}
          onChange={(e) => set("address", e.target.value)}
          required
        />
      </div>
    </div>
  );
}
