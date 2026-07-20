import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canRequestFranchise, FRANCHISE_REQUEST_MAX_TEAM } from "@/lib/franchise";
import { RequestFranchiseForm } from "./request-form";
import { Store, ChevronRight, Clock, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Franchise" };

export default async function FranchisePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [me, latestRequest] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isFranchise: true, franchiseGrantedAt: true, leftLegCount: true, rightLegCount: true },
    }),
    prisma.franchiseRequest.findFirst({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
    }),
  ]);
  if (!me) redirect("/login");

  const teamSize = me.leftLegCount + me.rightLegCount;

  // ---- Already a franchise: the door into the portal.
  if (me.isFranchise) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="card p-6 border-2 border-franchise-200 bg-franchise-soft">
          <div className="flex items-center gap-2 text-franchise-700 font-semibold">
            <Store className="h-5 w-5" /> You are a franchise
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {me.franchiseGrantedAt
              ? `Granted on ${me.franchiseGrantedAt.toLocaleDateString("en-IN")}.`
              : "Your franchise is active."}{" "}
            Approve your downline&apos;s loan requests, chase unpaid instalments and deliver
            Welcome Kits from your franchise portal.
          </p>
          <Link
            href="/franchise"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-franchise-gradient text-white font-semibold shadow-franchise-sm hover:opacity-95"
          >
            Login into Franchise <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ---- Request pending review.
  if (latestRequest?.status === "PENDING") {
    return (
      <div className="space-y-6">
        <Header />
        <div className="card p-6">
          <div className="flex items-center gap-2 text-amber-700 font-semibold">
            <Clock className="h-5 w-5" /> Request under review
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            You applied on {latestRequest.requestedAt.toLocaleDateString("en-IN")}. The admin will
            review it and get back to you.
          </p>
          {latestRequest.note && (
            <p className="text-sm mt-3 p-3 rounded-lg bg-muted">{latestRequest.note}</p>
          )}
        </div>
      </div>
    );
  }

  // me.isFranchise is false here — the franchise case returned above.
  const eligible = canRequestFranchise(me);

  return (
    <div className="space-y-6">
      <Header />

      {latestRequest?.status === "REJECTED" && (
        <div className="card p-5 border border-red-200">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <XCircle className="h-4 w-4" /> Your previous request was not approved
          </div>
          {latestRequest.adminNote && (
            <p className="text-sm text-muted-foreground mt-2">{latestRequest.adminNote}</p>
          )}
        </div>
      )}

      {eligible ? (
        <RequestFranchiseForm />
      ) : (
        <div className="card p-6">
          <p className="text-sm text-muted-foreground">
            Your team has {teamSize} members. Online franchise requests are open to members with a
            team under {FRANCHISE_REQUEST_MAX_TEAM} — please contact the admin directly to be
            appointed as a franchise.
          </p>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Store className="h-6 w-6 text-franchise-600" /> Franchise
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        A franchise leader manages their own downline — approving loan requests before they reach
        the admin, following up on unpaid instalments, and delivering Welcome Kits.
      </p>
    </div>
  );
}
