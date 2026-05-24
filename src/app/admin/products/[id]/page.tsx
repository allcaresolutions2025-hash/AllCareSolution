import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProductForm } from "@/components/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Edit: {product.name}</h1>
      <ProductForm initial={product} />
    </div>
  );
}
