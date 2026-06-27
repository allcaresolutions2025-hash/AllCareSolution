import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AddMemberForm } from "@/app/affiliate/dashboard/add-member/add-member-form";
import Link from "next/link";
import { UserPlus, KeyRound, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add Pro Max Member" };

// Pro Max member registration. Reuses the shared AddMemberForm pointed at the
// existing /api/members/pro-max endpoint, which places the new member into the
// SEPARATE Pro Max binary tree and awards Pro Max points.
export default async function ProMaxAddMemberPage({
  searchParams,
}: {
  searchParams: { referId?: string; side?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, referralCode: true },
  });
  if (!me) return null;

  const pins = await prisma.pin.findMany({
    where: { ownerId: me.id, status: "ACTIVE", proMax: true },
    orderBy: { createdAt: "asc" },
    select: { code: true },
  });

  const myDirects = await prisma.user.findMany({
    where: { proMaxReferrerId: me.id },
    select: { proMaxSlot: true },
  });
  const leftTaken = myDirects.some((d) => d.proMaxSlot === "LEFT");
  const rightTaken = myDirects.some((d) => d.proMaxSlot === "RIGHT");

  const prefilledReferId = (searchParams.referId || me.referralCode).toUpperCase();
  const prefilledSide = searchParams.side === "RIGHT" ? "RIGHT" : searchParams.side === "LEFT" ? "LEFT" : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-promax-600" /> Add Pro Max Member
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Use a Pro Max pin to add a person directly into your Pro Max binary tree.
        </p>
      </div>

      <div className="card p-5 bg-promax-soft border-promax-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-promax-100 text-promax-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm">
              You have <strong className="text-promax-700">{pins.length}</strong> active Pro Max pin{pins.length === 1 ? "" : "s"}.
            </div>
            <div className="text-xs text-muted-foreground">
              {pins.length === 0 ? (
                <>
                  No active Pro Max pins.{" "}
                  <Link href="/promax/dashboard/request-pin" className="text-promax-700 hover:underline">
                    Request pins
                  </Link>{" "}
                  before adding a member.
                </>
              ) : (
                <>Each Pro Max pin can be used once to enroll a new member.</>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <SlotStatus side="LEFT" taken={leftTaken} />
        <SlotStatus side="RIGHT" taken={rightTaken} />
      </div>

      {pins.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-promax-600" />
          You need an active Pro Max pin before adding a member.
        </div>
      ) : (
        <AddMemberForm
          pins={pins.map((p) => p.code)}
          defaultReferId={prefilledReferId}
          defaultSide={prefilledSide as "LEFT" | "RIGHT" | ""}
          myReferralCode={me.referralCode}
          endpoint="/api/members/pro-max"
          successHref="/promax/dashboard/tree"
        />
      )}
    </div>
  );
}

function SlotStatus({ side, taken }: { side: "LEFT" | "RIGHT"; taken: boolean }) {
  const tone = side === "LEFT" ? "emerald" : "sky";
  const styles = tone === "emerald"
    ? { ring: "border-emerald-200", chip: "bg-emerald-100 text-emerald-800" }
    : { ring: "border-sky-200", chip: "bg-sky-100 text-sky-800" };
  return (
    <div className={`card p-4 border ${styles.ring}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${styles.chip}`}>{side} slot</span>
        <span className={`text-xs ${taken ? "text-muted-foreground" : "text-emerald-700 font-medium"}`}>
          {taken ? "Filled" : "Open"}
        </span>
      </div>
    </div>
  );
}
