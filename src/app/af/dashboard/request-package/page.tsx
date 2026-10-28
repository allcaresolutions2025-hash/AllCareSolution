import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPackageConfig } from "@/lib/package-plan";
import { PackagePurchaseForm } from "../package-forms";
import { PackagePlus, ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request Package" };

export default async function AfRequestPackagePage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const userId = session.user.id;

  const [cfg, me, pending, products] = await Promise.all([
    getPackageConfig(),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true, address: true, afTermsAcceptedAt: true },
    }),
    prisma.packagePurchase.findFirst({ where: { userId, status: "PENDING" }, select: { id: true } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      select: { id: true, name: true, price: true },
      orderBy: { price: "asc" },
    }),
  ]);
  if (!me) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackagePlus className="h-6 w-6 text-af-600" /> Request a package
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the Starter package ({cfg.starterPoints} pts) or enter your own points (minimum {cfg.minPoints} pts),
          and pick the product to be delivered. The admin verifies and approves your request. Once approved, your package
          points are activated and its BV joins the AF binary tree.
        </p>
      </div>

      {me.afTermsAcceptedAt ? (
        <PackagePurchaseForm
          starterPoints={cfg.starterPoints}
          minPoints={cfg.minPoints}
          bvPercent={cfg.bvPercent}
          products={products}
          defaults={{ shipName: me.name, shipPhone: me.phone ?? "", shipAddress: me.address ?? "" }}
          hasPending={Boolean(pending)}
        />
      ) : (
        <div className="card p-6 flex flex-wrap items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-af-100 text-af-700 grid place-items-center shrink-0">
            <ScrollText className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Accept the Terms &amp; Conditions first</div>
            <div className="text-sm text-muted-foreground">
              Package requests open once you have read and accepted the AF Solution Terms &amp; Conditions.
            </div>
          </div>
          <Link href="/af/dashboard/terms" className="btn-primary">
            Read &amp; accept
          </Link>
        </div>
      )}
    </div>
  );
}
