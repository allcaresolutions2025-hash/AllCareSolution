import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { whatsappLink } from "@/lib/franchise";
import { WelcomeKitActions } from "./kit-actions";
import { Gift, MessageCircle, Truck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome Kits — Franchise" };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-franchise-100 text-franchise-700",
  DISPATCHED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default async function FranchiseWelcomeKitsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Welcome Kit is level 0. Only kits routed to this franchise appear here —
  // every other reward level stays on the admin's own dispatch queue.
  const claims = await prisma.rewardClaim.findMany({
    where: { franchiseId: session.user.id, level: 0 },
    orderBy: [{ status: "asc" }, { requestedAt: "asc" }],
    include: {
      user: {
        select: {
          name: true, referralCode: true, phone: true, whatsappNumber: true,
          addresses: {
            where: { isDefault: true },
            take: 1,
            select: { line1: true, line2: true, city: true, state: true, pincode: true, phone: true },
          },
        },
      },
    },
  });

  const pending = claims.filter((c) => c.status === "PENDING");
  const inFlight = claims.filter((c) => c.status === "APPROVED" || c.status === "DISPATCHED");
  const done = claims.filter((c) => c.status === "DELIVERED" || c.status === "REJECTED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6 text-franchise-600" /> Welcome Kits
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Approve your team&apos;s Welcome Kit claims and deliver them yourself. The admin is
          notified at each step — they don&apos;t ship these. Welcome Kit is the only product
          a franchise handles.
        </p>
      </div>

      <KitSection title={`Awaiting your approval (${pending.length})`} claims={pending} empty="No new kit claims." />
      <KitSection title={`To deliver (${inFlight.length})`} claims={inFlight} empty="Nothing out for delivery." icon={<Truck className="h-4 w-4 text-blue-600" />} />
      <KitSection title={`Completed (${done.length})`} claims={done} empty="Nothing completed yet." />
    </div>
  );
}

type ClaimRow = {
  id: string;
  status: string;
  requestedAt: Date;
  franchiseDeliveredAt: Date | null;
  user: {
    name: string;
    referralCode: string;
    phone: string | null;
    whatsappNumber: string | null;
    addresses: { line1: string; line2: string | null; city: string; state: string; pincode: string; phone: string }[];
  };
};

function KitSection({ title, claims, empty, icon }: { title: string; claims: ClaimRow[]; empty: string; icon?: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold flex items-center gap-2 mb-4">
        {icon ?? <Gift className="h-4 w-4 text-franchise-600" />} {title}
      </h2>
      {claims.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2 pr-3">Member</th>
                <th className="text-left py-2 pr-3">Delivery address</th>
                <th className="text-left py-2 pr-3">Status</th>
                <th className="text-right py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {claims.map((c) => {
                const addr = c.user.addresses[0];
                const msg = `Hello ${c.user.name}, your ACHT MART Welcome Kit is being handled by your franchise. We will contact you shortly regarding delivery.`;
                const link = whatsappLink(c.user.whatsappNumber ?? c.user.phone, msg);
                return (
                  <tr key={c.id}>
                    <td className="py-3 pr-3 align-top">
                      <div className="font-medium">{c.user.name}</div>
                      <div className="text-xs text-muted-foreground">{c.user.referralCode}</div>
                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          <MessageCircle className="h-3 w-3" /> WhatsApp
                        </a>
                      )}
                    </td>
                    <td className="py-3 pr-3 align-top text-xs text-muted-foreground max-w-[260px]">
                      {addr ? (
                        <>
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />
                          {addr.city}, {addr.state} — {addr.pincode}<br />
                          {addr.phone}
                        </>
                      ) : (
                        <span className="text-amber-700">No saved address — contact the member.</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 align-top">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[c.status] ?? "bg-slate-100 text-slate-700"}`}>
                        {c.status}
                      </span>
                      {c.franchiseDeliveredAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {c.franchiseDeliveredAt.toLocaleDateString("en-IN")}
                        </div>
                      )}
                    </td>
                    <td className="py-3 align-top text-right">
                      <WelcomeKitActions id={c.id} status={c.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
