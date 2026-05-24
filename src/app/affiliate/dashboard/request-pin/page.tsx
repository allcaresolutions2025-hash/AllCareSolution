import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RequestPinForm } from "./request-pin-form";
import { CheckCircle2, Clock, XCircle, KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RequestPinPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [requests, activePinCount] = await Promise.all([
    prisma.pinRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { _count: { select: { pins: true } } },
    }),
    prisma.pin.count({
      where: { ownerId: session.user.id, status: "ACTIVE" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Request PIN</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pins let you add new members to your binary tree. Request the count you need; admin reviews each request before pins are issued.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-emerald-100 text-emerald-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{activePinCount}</div>
            <div className="text-xs text-muted-foreground">Active pins ready to use</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-amber-100 text-amber-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">
              {requests.filter((r) => r.status === "PENDING").length}
            </div>
            <div className="text-xs text-muted-foreground">Pending requests</div>
          </div>
        </div>
      </div>

      <RequestPinForm />

      <div className="card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold">Your recent requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No requests yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Requested</th>
                <th className="px-4 py-2 font-medium">Quantity</th>
                <th className="px-4 py-2 font-medium">Mobile</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Pins issued</th>
                <th className="px-4 py-2 font-medium">Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 text-muted-foreground">
                    {r.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-2 font-medium tabular-nums">{r.quantity}</td>
                  <td className="px-4 py-2 text-xs font-mono">{r.mobileNumber}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2 tabular-nums">{r._count.pins}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {r.reviewedAt ? r.reviewedAt.toLocaleDateString("en-IN") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
