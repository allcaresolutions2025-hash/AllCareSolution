import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Leaf } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product) return { title: "Product not found" };
  return { title: product.name, description: product.shortDesc };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product || !product.isActive) notFound();

  const savings = product.mrp - product.price;
  const savingsPercent = Math.round((savings / product.mrp) * 100);

  return (
    <div className="container-page grid md:grid-cols-2 gap-10">
      <div>
        <div className="aspect-square bg-brand-50 rounded-2xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        </div>
        {product.gallery.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {product.gallery.slice(0, 4).map((img, i) => (
              <div key={i} className="aspect-square rounded-md bg-brand-50 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="text-muted-foreground mt-2">{product.shortDesc}</p>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-3xl font-bold text-brand-700">{formatINR(product.price)}</span>
          {product.mrp > product.price && (
            <>
              <span className="text-lg text-muted-foreground line-through">{formatINR(product.mrp)}</span>
              <span className="badge-green">Save {savingsPercent}%</span>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Inclusive of all taxes (GST {product.gstRate}%)
        </p>

        <div className="mt-6">
          {product.stock > 0 ? (
            <AddToCartButton
              line={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                stock: product.stock,
                quantity: 1,
              }}
            />
          ) : (
            <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed">
              Out of stock
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
          <Pill icon="🚚" label="Tracked shipping" />
          <Pill icon="🔁" label="30-day buyback" />
          <Pill icon="🧪" label="Lab tested" />
        </div>

        <div className="mt-8 space-y-5">
          <Section title="Description">
            <p className="whitespace-pre-line text-sm leading-relaxed">{product.description}</p>
          </Section>
          {product.ingredients && (
            <Section title="Ingredients">
              <p className="whitespace-pre-line text-sm leading-relaxed">{product.ingredients}</p>
            </Section>
          )}
          <Section title="How to use">
            <p className="text-sm">
              Take 5-10 drops with a glass of warm water, twice a day before meals.
              Consult your physician if pregnant, nursing, or on any medication.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-semibold flex items-center gap-2 text-brand-800">
        <Leaf className="h-4 w-4" /> {title}
      </h2>
      <div className="mt-2 text-muted-foreground">{children}</div>
    </div>
  );
}

function Pill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-center">
      <div className="text-lg">{icon}</div>
      <div className="mt-0.5 text-[11px] font-medium">{label}</div>
    </div>
  );
}
