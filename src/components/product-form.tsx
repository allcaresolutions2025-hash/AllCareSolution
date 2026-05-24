"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Upload, X } from "lucide-react";

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
  const fileRef = useRef<HTMLInputElement>(null);
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
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setUploading(true);
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.src = ev.target?.result as string;
      img.onload = () => {
        const MAX = 800;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        setForm((f) => ({ ...f, imageUrl: dataUrl }));
        setUploading(false);
      };
    };
    reader.readAsDataURL(file);
  }

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
      </div>

      {/* Image upload */}
      <div>
        <label className="label">Product Image</label>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Preview */}
          <div className="relative h-32 w-32 shrink-0 rounded-lg border-2 border-dashed border-border overflow-hidden bg-muted/30 flex items-center justify-center">
            {form.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setForm((f) => ({ ...f, imageUrl: "" })); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground text-center px-2">No image</span>
            )}
          </div>

          <div className="flex-1 space-y-2">
            {/* File picker */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-secondary w-full sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Processing…" : "Upload image"}
            </button>
            <p className="text-xs text-muted-foreground">
              JPG, PNG or WEBP. Auto-resized to 800px. Or paste a URL below.
            </p>
            {/* Fallback URL input */}
            <input
              type="url"
              className="input text-xs"
              placeholder="https://example.com/image.jpg"
              value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            />
          </div>
        </div>
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
