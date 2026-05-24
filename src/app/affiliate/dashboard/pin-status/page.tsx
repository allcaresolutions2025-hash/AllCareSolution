import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TransferPinForm } from "./transfer-pin-form";
import { KeyRound, CheckCircle2, ArrowLeftRight, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

type Tab = "unused" | "used" | "transfer";
const TABS: Tab[] = ["unused", "used", "transfer"];

export default async function PinStatusPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const tab: Tab = TABS.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : "unused";

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { transactionPasswordHash: true, referralCode: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pin Status</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your pin balance, history, and transfers.
        </p>
      </div>

      <div className="border-b">
        <div className="flex gap-1">
          <TabLink current={tab} value="unused" label="Unused Pins" />
          <TabLink current={tab} value="used" label="Used Pins" />
          <TabLink current={tab} value="transfer" label="Transfer Pin" />
        </div>
      </div>

      {tab === "unused" && <UnusedPanel userId={session.user.id} />}
      {tab === "used" && <UsedPanel userId={session.user.id} />}
      {tab === "transfer" && (
        <TransferPanel
          userId={session.user.id}
          hasTxnPassword={!!me?.transactionPasswordHash}
          myCode={me?.referralCode ?? ""}
        />
      )}
    </div>
  );
}

function TabLink({ current, value, label }: { current: Tab; value: Tab; label: string }) {
  const active = current === value;
  return (
    <Link
      href={`?tab=${value}`}
      scroll={false}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-brand-700 text-brand-700"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-slate-300"
      }`}
    >
      {label}
    </Link>
  );
}

async function UnusedPanel({ userId }: { userId: string }) {
  const pins = await prisma.pin.findMany({
    where: { ownerId: userId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    include: { request: { select: { createdAt: true, reviewedAt: true } } },
  });

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between">
        <h2 className="font-semibold inline-flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-emerald-700" /> Unused pins ({pins.length})
        </h2>
        <Link href="/affiliate/dashboard/request-pin" className="text-xs text-brand-700 hover:underline">
          Request more
        </Link>
      </div>
      {pins.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No unused pins.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Pin code</th>
                <th className="px-4 py-2 font-medium">Issued</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pins.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 font-mono">{p.code}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {p.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function UsedPanel({ userId }: { userId: string }) {
  const pins = await prisma.pin.findMany({
    where: { ownerId: userId, status: "USED" },
    orderBy: { usedAt: "desc" },
    include: {
      usedForUser: { select: { name: true, email: true, referralCode: true, slot: true } },
    },
  });

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b">
        <h2 className="font-semibold">Used pins ({pins.length})</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Each used pin shows the member it was consumed to enroll.
        </p>
      </div>
      {pins.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No used pins yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Pin code</th>
                <th className="px-4 py-2 font-medium">Used on</th>
                <th className="px-4 py-2 font-medium">Member name</th>
                <th className="px-4 py-2 font-medium">Member ID</th>
                <th className="px-4 py-2 font-medium">Slot</th>
              </tr>
            </thead>
            <tbody>
              {pins.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 font-mono">{p.code}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {p.usedAt?.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {p.usedForUser ? (
                      <>
                        <div className="font-medium">{p.usedForUser.name}</div>
                        <div className="text-xs text-muted-foreground">{p.usedForUser.email}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {p.usedForUser?.referralCode ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {p.usedForUser?.slot && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        p.usedForUser.slot === "LEFT"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-sky-100 text-sky-800"
                      }`}>
                        {p.usedForUser.slot}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function TransferPanel({
  userId,
  hasTxnPassword,
  myCode,
}: {
  userId: string;
  hasTxnPassword: boolean;
  myCode: string;
}) {
  const activePins = await prisma.pin.findMany({
    where: { ownerId: userId, status: "ACTIVE" },
    select: { id: true, code: true },
    orderBy: { createdAt: "asc" },
  });

  if (!hasTxnPassword) {
    return (
      <div className="card p-8 text-center bg-amber-50/40 border-amber-200">
        <div className="h-12 w-12 mx-auto rounded-full bg-amber-100 text-amber-700 grid place-items-center mb-3">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="font-semibold text-amber-900">Transaction password required</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          You must set a transaction password before transferring pins. This protects your pins from unauthorized transfers.
        </p>
        <Link
          href="/affiliate/dashboard/settings"
          className="btn-primary mt-4 inline-flex"
        >
          Set transaction password
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 inline-flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-violet-100 text-violet-700 grid place-items-center">
          <ArrowLeftRight className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-medium">{activePins.length} active pin{activePins.length === 1 ? "" : "s"} available to transfer</div>
          <div className="text-xs text-muted-foreground">Recipient must be a member in your downline.</div>
        </div>
      </div>

      {activePins.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          No active pins to transfer.
        </div>
      ) : (
        <TransferPinForm pins={activePins.map((p) => p.code)} myCode={myCode} />
      )}
    </div>
  );
}
