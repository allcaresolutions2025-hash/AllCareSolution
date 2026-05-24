import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Saved Addresses</h1>
      {addresses.length === 0 ? (
        <div className="card p-10 text-center text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-3" />
          <p>You haven&apos;t saved any addresses yet.</p>
          <p className="text-xs mt-1">Addresses are saved automatically when you check out.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">{a.fullName}</h3>
                {a.isDefault && <span className="badge-green">Default</span>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
                {a.city}, {a.state} {a.pincode}<br />
                {a.phone}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
