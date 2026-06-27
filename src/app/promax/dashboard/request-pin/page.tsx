import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestProMaxPinsForm } from "@/app/affiliate/dashboard/pin-pro-max/request-pro-max-pins-form";
import { KeyRound, Clock, CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request Pro Max Pins" };

export default async function ProMaxRequestPinPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [user, activePins, requests] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } }),
    prisma.pin.count({ where: { ownerId: session.user.id, status: "ACTIVE", proMax: true } }),
    prisma.pinRequest.findMany({
      where: { userId: session.user.id, proMax: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  if (!user) return null;

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-promax-600" /> Request Pro Max Pins
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask the Pro Max admin for pins. Once approved, use each pin to register a new member into your tree.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Stat label="Pins ready" value={activePins} />
        <Stat label="Pending requests" value={pendingCount} />
      </div>

      <RequestProMaxPinsForm defaultMobile={user.phone ?? ""} />

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Your requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No requests yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Requested</th>
                <th className="px-4 py-2 font-medium text-right">Qty</th>
                <th className="px-4 py-2 font-medium">Mobile</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 text-muted-foreground">
                    {r.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.quantity}</td>
                  <td className="px-4 py-2 text-xs font-mono">{r.mobileNumber}</td>
                  <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg grid place-items-center bg-promax-100 text-promax-700">
        <KeyRound className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}
