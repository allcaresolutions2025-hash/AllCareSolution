import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata = { title: "Shop all Products" };

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="container-page">
      <h1 className="text-3xl font-bold">All Products</h1>
      <p className="text-muted-foreground mt-1">
        Authentic Ayurvedic & herbal wellness — formulated and bottled in India.
      </p>
      {products.length === 0 ? (
        <div className="card p-10 mt-8 text-center text-muted-foreground">
          No products yet. Run <code className="bg-muted px-2 py-0.5 rounded">npm run db:seed</code>.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="card overflow-hidden hover:shadow-lg transition group"
            >
              <div className="aspect-square bg-brand-50 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold line-clamp-1">{p.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2.5em]">
                  {p.shortDesc}
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-brand-700">{formatINR(p.price)}</span>
                  {p.mrp > p.price && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatINR(p.mrp)}
                    </span>
                  )}
                </div>
                {p.stock <= 0 && (
                  <span className="badge-red mt-2">Out of stock</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
