import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AF_ID_PATTERN, getAfDownline } from "@/lib/af";
import { getSetting } from "@/lib/settings";
import { formatDateShort } from "@/lib/date";
import { AfAddMemberForm, type OpenSlot } from "./af-add-member-form";
import { UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add AF Member" };

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-amber",
  APPROVED: "badge-green",
  REJECTED: "badge-red",
};

export default async function AfAddMemberPage({ searchParams }: { searchParams: { referId?: string; side?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [me, downline, pending, requests, feePoints] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, referralCode: true },
    }),
    getAfDownline(session.user.id),
    prisma.afIdRequest.findMany({
      where: { status: "PENDING", sponsorAfId: { not: null }, side: { not: null } },
      select: { sponsorAfId: true, side: true },
    }),
    prisma.afIdRequest.findMany({
      where: { requesterId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getSetting("AF_ID_FEE_POINTS"),
  ]);
  if (!me) return null;

  // Every open LEFT/RIGHT slot in my tree (me included), nearest first. A slot
  // already in a pending request is not offered again.
  const taken = new Set([
    ...downline.map((n) => `${n.referrerId}:${n.slot}`),
    ...pending.map((r) => `${r.sponsorAfId}:${r.side}`),
  ]);
  const openSlots: OpenSlot[] = [];
  for (const n of [{ id: me.id, name: me.name, referralCode: me.referralCode, depth: 0 }, ...downline]) {
    for (const side of ["LEFT", "RIGHT"] as const) {
      // Filled slots are keyed by parent user id, pending requests by parent AF ID.
      if (taken.has(`${n.id}:${side}`) || taken.has(`${n.referralCode}:${side}`)) continue;
      openSlots.push({ afId: n.referralCode, name: n.name, side, depth: Number(n.depth) });
    }
  }

  // Preselected from the L+ / R+ slot clicked on the AF tree.
  const referId = searchParams.referId?.toUpperCase();
  const referSide = searchParams.side === "RIGHT" ? "RIGHT" : searchParams.side === "LEFT" ? "LEFT" : null;
  const defaultSlot =
    referId && AF_ID_PATTERN.test(referId) && referSide && openSlots.some((o) => o.afId === referId && o.side === referSide)
      ? `${referId}:${referSide}`
      : "";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-af-600" /> Add AF Member
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Request a new AF account in an open slot under you or anyone in your AF tree. Pick the position: the new
          account is placed directly under that parent. Each new AF ID costs{" "}
          <strong>{feePoints} pts</strong>, paid to the admin. Once the admin confirms the payment and approves, the AF ID
          appears below and the new member can sign in, build their tree and request packages. Enter the new account
          holder&apos;s own PAN, nominee, address and bank details. They can only be changed by the admin later.
        </p>
      </div>

      <AfAddMemberForm
        openSlots={openSlots}
        defaultSlot={defaultSlot}
        feePoints={feePoints}
      />

      <div className="card">
        <div className="px-5 py-3 border-b font-semibold">My AF ID requests</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Account holder</th>
                <th className="px-4 py-2 font-medium">Placement</th>
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
