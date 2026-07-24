import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ShoppingBag, PackageSearch } from "lucide-react";
import { productName, type Lang } from "@/lib/i18n";
import { ProductCard } from "./product-card";
import { CartBar } from "./cart-bar";

export const dynamic = "force-dynamic";

// Single-page catalog: every active product on one page so members can pick and
// add to cart without opening a detail page. Products are grouped into Wellness
// and Groceries (the latter further split by sub-category). Names are shown in
// the member's preferred language (English fallback).
export default async function StorePage() {
  const session = await getServerSession(authOptions);

  const [me, products] = await Promise.all([
    session
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { preferredLanguage: true },
        })
      : Promise.resolve(null),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { subCategory: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true, slug: true, name: true, nameTa: true, nameHi: true,
        category: true, subCategory: true, shortDesc: true,
        price: true, mrp: true, imageUrl: true, stock: true,
      },
    }),
  ]);
  const lang: Lang = me?.preferredLanguage ?? "EN";

  // Resolve display names once, then split by category. Groceries are further
  // bucketed by sub-category (preserving the query's ordering).
  const cards = products.map((p) => ({
    id: p.id, slug: p.slug, displayName: productName(p, lang),
    shortDesc: p.shortDesc, price: p.price, mrp: p.mrp,
    imageUrl: p.imageUrl, stock: p.stock,
    category: p.category, subCategory: p.subCategory,
  }));
  const wellness = cards.filter((c) => c.category === "WELLNESS");
  const groceries = cards.filter((c) => c.category === "GROCERIES");
  const grocerySections = new Map<string, typeof cards>();
  for (const c of groceries) {
    const key = c.subCategory || "Other";
    if (!grocerySections.has(key)) grocerySections.set(key, []);
    grocerySections.get(key)!.push(c);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-brand-600" /> Shop
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add products to your cart, then pay by Cash on Delivery or with your payout wallet points.
          </p>
        </div>
        <Link
          href="/affiliate/dashboard/store/orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted"
        >
          <PackageSearch className="h-4 w-4" /> My Orders
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="card p-10 text-center text-muted-foreground">
          No products available right now. Please check back soon.
        </div>
      ) : (
        <>
          {wellness.length > 0 && (
            <Section title="Wellness">
              <Grid cards={wellness} />
            </Section>
          )}

          {grocerySections.size > 0 && (
            <Section title="Groceries">
              <div className="space-y-6">
                {[...grocerySections.entries()].map(([sub, list]) => (
                  <div key={sub}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {sub}
                    </h3>
                    <Grid cards={list} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          <CartBar />
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold border-b pb-2">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ cards }: { cards: React.ComponentProps<typeof ProductCard>["product"][] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <ProductCard key={c.id} product={c} />
      ))}
    </div>
  );
}
