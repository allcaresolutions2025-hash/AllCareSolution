"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This will hide it from customers. Active orders are not affected.`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      toast.success(`"${name}" deleted`);
      router.refresh();
    } else {
      toast.error("Failed to delete product");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50 text-sm"
      title="Delete product"
    >
      <Trash2 className="h-4 w-4" />
      {loading ? "…" : "Delete"}
    </button>
  );
}
