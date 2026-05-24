"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FileText, ExternalLink } from "lucide-react";

export function KycRow({
  id,
  user,
  panNumber,
  panName,
  productReceiptUrl,
  status,
  submittedAt,
}: {
  id: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    bankIfsc: string | null;
    bankName: string | null;
  };
  panNumber: string | null;
  panName: string | null;
  productReceiptUrl: string | null;
  status: string;
  submittedAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function action(approve: boolean) {
    let notes = "";
    if (!approve) {
      notes = prompt("Reason for rejection (shown to user):") || "";
      if (!notes) return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/kyc/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve, notes }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Failed");
      return;
    }
    toast.success(approve ? "Approved" : "Rejected");
    router.refresh();
  }

  function openDocument() {
    if (!productReceiptUrl) return;
    const w = window.open();
    if (!w) return;
    if (productReceiptUrl.startsWith("data:application/pdf")) {
      w.document.write(`<iframe src="${productReceiptUrl}" style="width:100%;height:100vh;border:none"></iframe>`);
    } else {
      w.document.write(`<img src="${productReceiptUrl}" style="max-width:100%" />`);
    }
    w.document.close();
  }

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <div className="font-medium">{user.name}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
        <div className="text-xs text-muted-foreground">{user.phone}</div>
      </td>
      <td className="px-4 py-3 text-xs font-mono">
        <div>{panNumber ?? "—"}</div>
        <div className="text-muted-foreground">{panName ?? "—"}</div>
      </td>
      <td className="px-4 py-3 text-xs">
        <div className="font-medium">{user.bankAccountName ?? "—"}</div>
        <div className="font-mono text-muted-foreground">A/c {user.bankAccountNumber ?? "—"}</div>
        <div className="font-mono text-muted-foreground">IFSC {user.bankIfsc ?? "—"}</div>
        <div className="text-muted-foreground">{user.bankName ?? "—"}</div>
      </td>
      <td className="px-4 py-3">
        {productReceiptUrl ? (
          <button
            type="button"
            onClick={openDocument}
            className="inline-flex items-center gap-1.5 text-xs text-brand-700 hover:text-brand-900 hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            View document
            <ExternalLink className="h-3 w-3 opacity-60" />
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Not uploaded</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {submittedAt ? new Date(submittedAt).toLocaleString("en-IN") : "—"}
      </td>
      <td className="px-4 py-3">
        <span
          className={
            status === "PENDING"
              ? "badge-amber"
              : status === "APPROVED"
              ? "badge-green"
              : "badge-red"
          }
        >
          {status}
        </span>
      </td>
      <td className="px-4 py-3">
        {status === "PENDING" ? (
          <div className="flex gap-2">
            <button
              disabled={loading}
              onClick={() => action(true)}
              className="btn-primary text-xs px-3 py-1"
            >
              Approve
            </button>
            <button
              disabled={loading}
              onClick={() => action(false)}
              className="btn-danger text-xs px-3 py-1"
            >
              Reject
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
