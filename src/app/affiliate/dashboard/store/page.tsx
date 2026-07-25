import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ShoppingBag, PackageSearch } from "lucide-react";
import { productName, effectiveLanguage, currentChoice, languageForState, type Lang } from "@/lib/i18n";
import { CategoryList, type CatalogCategory } from "./category-list";
import { FloatingCartButton } from "./floating-cart-button";
import { ShopLanguageSwitcher } from "./language-switcher";

export const dynamic = "force-dynamic";

// Catalog as a list of clickable category fields (Wellness, and each grocery
// sub-category). Tapping one opens its products to add to cart — see
// CategoryList. A floating cart icon (FloatingCartButton) stays on screen so
// the member can review what they've added and proceed to checkout. Names are
// shown in the member's preferred language (English fallback).
export default async function StorePage() {
  const session = await getServerSession(authOptions);

  const [me, address, products] = await Promise.all([
    session
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { preferredLanguage: true, languageIsManual: true },
        })
      : Promise.resolve(null),
    session
      ? prisma.address.findFirst({
          where: { userId: session.user.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          select: { state: true },
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
  const prefs = me ?? { preferredLanguage: "EN" as Lang, languageIsManual: false };
  const lang: Lang = effectiveLanguage(prefs, address?.state);
  const choice = currentChoice(prefs);
  const autoLang = languageForState(address?.state);

  // Resolve display names once, then group into category "fields": Wellness as
  // one field, and each grocery sub-category as its own field.
  const items = products.map((p) => ({
    id: p.id, slug: p.slug, displayName: productName(p, lang),
    shortDesc: p.shortDesc, price: p.price, mrp: p.mrp,
    imageUrl: p.imageUrl, stock: p.stock,
    category: p.category, subCategory: p.subCategory,
  }));
  const wellness = items.filter((c) => c.category === "WELLNESS");
  const groceries = items.filter((c) => c.category === "GROCERIES");
  const grocerySections = new Map<string, typeof items>();
  for (const c of groceries) {
    const key = c.subCategory || "Other";
    if (!grocerySections.has(key)) grocerySections.set(key, []);
    grocerySections.get(key)!.push(c);
  }
  const categories: CatalogCategory[] = [
    ...(wellness.length > 0 ? [{ key: "WELLNESS", title: "Wellness", items: wellness }] : []),
    ...[...grocerySections.entries()].map(([sub, list]) => ({ key: `GROCERIES:${sub}`, title: sub, items: list })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-brand-600" /> Shop
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tap a category to browse and add to cart, then pay by Cash on Delivery or with your payout wallet points.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ShopLanguageSwitcher initial={choice} autoLang={autoLang} />
          <Link
            href="/affiliate/dashboard/store/orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted"
          >
            <PackageSearch className="h-4 w-4" /> My Orders
          </Link>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="card p-10 text-center text-muted-foreground">
          No products available right now. Please check back soon.
        </div>
      ) : (
        <CategoryList categories={categories} />
      )}

      <FloatingCartButton />
    </div>
  );
}
