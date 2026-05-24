"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Initial = {
  id?: string;
  slug: string;
  name: string;
  shortDesc: string;
  description: string;
  ingredients: string | null;
  mrp: number;
  price: number;
  stock: number;
  sku: string;
  imageUrl: string;
  gstRate: number;
  isActive: boolean;
};

export function ProductForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    slug: initial?.slug || "",
    name: initial?.name || "",
    shortDesc: initial?.shortDesc || "",
    description: initial?.description || "",
    ingredients: initial?.ingredients || "",
    mrpPoints: initial ? initial.mrp / 100 : 1299,
    pricePoints: initial ? initial.price / 100 : 1000,
    stock: initial?.stock ?? 100,
    sku: initial?.sku || "",
    imageUrl: initial?.imageUrl || "",
    gstRate: initial?.gstRate ?? 18,
    isActive: initial?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      slug: form.slug,
      name: form.name,
      shortDesc: form.shortDesc,
      description: form.description,
      ingredients: form.ingredients,
      mrp: Math.round(form.mrpPoints * 100),
      price: Math.round(form.pricePoints * 100),
      stock: form.stock,
      sku: form.sku,
      imageUrl: form.imageUrl,
      gstRate: form.gstRate,
      isActive: form.isActive,
    };
    const url = isEdit ? `/api/admin/products/${initial!.id}` : "/api/admin/products";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success(isEdit ? "Product updated" : "Product created");
    router.push("/admin/products");
    router.refresh();
  }

  async function deleteProduct() {
    if (!initial?.id) return;
    if (!confirm("Hide this product? (It will still appear on past orders.)")) return;
    const res = await fetch(`/api/admin/products/${initial.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Product hidden");
      router.push("/admin/products");
      router.refresh();
    } else {
      toast.error("Failed");
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} required />
      </div>
      <Field label="Short description (max 200)" value={form.shortDesc} onChange={(v) => setForm({ ...form, shortDesc: v })} required />
      <div>
        <label className="label">Full description</label>
        <textarea
          rows={5}
          className="input"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="label">Ingredients (optional)</label>
        <textarea
          rows={3}
          className="input"
          value={form.ingredients}
          onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
        />
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <Field label="MRP (points)" type="number" value={String(form.mrpPoints)} onChange={(v) => setForm({ ...form, mrpPoints: parseFloat(v) || 0 })} required />
        <Field label="Selling price (points)" type="number" value={String(form.pricePoints)} onChange={(v) => setForm({ ...form, pricePoints: parseFloat(v) || 0 })} required />
        <Field label="Stock" type="number" value={String(form.stock)} onChange={(v) => setForm({ ...form, stock: parseInt(v) || 0 })} required />
        <Field label="GST %" type="number" value={String(form.gstRate)} onChange={(v) => setForm({ ...form, gstRate: parseInt(v) || 0 })} required />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} required />
        <Field label="Image URL" value={form.imageUrl} onChange={(v) => setForm({ ...form, imageUrl: v })} required />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        Active (visible to customers)
      </label>
      <div className="flex justify-between">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </button>
        {isEdit && (
          <button type="button" onClick={deleteProduct} className="btn-danger">
            Hide product
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label, value, onChange, type = "text", required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
