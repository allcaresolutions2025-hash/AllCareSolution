import Link from "next/link";
import { prisma } from "@/lib/db";
import { ShoppingBag, PackageSearch } from "lucide-react";
import { ProductCard } from "./product-card";
import { CartBar } from "./cart-bar";

export const dynamic = "force-dynamic";

// Single-page catalog: every active product on one page so members can pick and
// add to cart without opening a detail page for each. Quantity + add-to-cart
// live inline on each tile (see ProductCard).
export default async function StorePage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, slug: true, name: true, shortDesc: true,
      price: true, mrp: true, imageUrl: true, stock: true,
    },
  });

  return (
    <div className="space-y-6">
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

      {products.length === 0 ? (
        <div className="card p-10 text-center text-muted-foreground">
          No products available right now. Please check back soon.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <CartBar />
        </>
      )}
    </div>
  );
}
