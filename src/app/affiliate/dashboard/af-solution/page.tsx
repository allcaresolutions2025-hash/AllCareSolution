import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateShort } from "@/lib/date";
import { AfIdRequestForm } from "./af-id-request-form";
import { Crown, LogIn } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "AF Solution" };

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-amber",
  APPROVED: "badge-green",
  REJECTED: "badge-red",
};

export default async function AfSolutionPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [me, requests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, phone: true, email: true },
    }),
    prisma.afIdRequest.findMany({
      where: { requesterId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  if (!me) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-af-gradient text-white p-6 shadow-af-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 grid place-items-center shrink-0">
            <Crown className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">AF Solution</h1>
            <p className="text-sm text-white/85 mt-1">
              AF accounts have their own login and binary tree. Request an AF ID below. Once the admin creates it, sign in
              at AF Login to request a package of 250 pts or more, each with a product delivered to you.
            </p>
          </div>
          <Link
            href="/af/login"
            className="inline-flex items-center gap-2 rounded-lg bg-white text-af-800 px-4 py-2.5 text-sm font-semibold hover:bg-af-50"
          >
            <LogIn className="h-4 w-4" /> AF Login
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        <AfIdRequestForm
          defaults={{ name: me.name, mobile: me.phone ?? "", email: me.email }}
          hasPending={requests.some((r) => r.status === "PENDING")}
        />
        <div className="card p-5 text-sm space-y-2">
          <h2 className="font-semibold">How it works</h2>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Send a request for a new AF ID.</li>
            <li>The admin reviews it, places the account in the AF tree and creates it.</li>
            <li>Your AF ID appears in the list below.</li>
            <li>
              Sign in at <strong>AF Login</strong> with the AF ID. The first password is the mobile number. Change it after
              you sign in.
            </li>
            <li>Accept the AF Terms &amp; Conditions, then request your package.</li>
          </ol>
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-3 border-b font-semibold">My AF ID requests</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Account holder</th>
                <th className="px-4 py-2 font-medium">Requested placement</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">AF ID</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{formatDateShort(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.mobile}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.sponsorAfId ? (
                      <>
                        <span className="font-mono">{r.sponsorAfId}</span>
                        {r.side ? ` · ${r.side.toLowerCase()}` : ""}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Admin decides</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[r.status]}>{r.status}</span>
                    {r.adminNote && <div className="text-xs text-muted-foreground mt-1 max-w-[220px]">“{r.adminNote}”</div>}
                  </td>
                  <td className="px-4 py-3">
                    {r.createdAfId ? (
                      <>
                        <div className="font-mono font-semibold">{r.createdAfId}</div>
                        <div className="text-xs text-muted-foreground">First password: the mobile number</div>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No AF ID requests yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
