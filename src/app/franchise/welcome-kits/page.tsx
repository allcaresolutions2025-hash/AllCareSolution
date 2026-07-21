import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { whatsappLink } from "@/lib/franchise";
import { WELCOME_KIT_LEVEL } from "@/lib/rewards";
import { Pagination } from "@/components/pagination";
import { WelcomeKitActions } from "./kit-actions";
import { Gift, MessageCircle, Truck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome Kits — Franchise" };

const PAGE_SIZE = 20;

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-franchise-100 text-franchise-700",
  DISPATCHED: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

function pageNum(v: string | undefined): number {
  return Math.max(1, parseInt(v ?? "1", 10) || 1);
}

export default async function FranchiseWelcomeKitsPage({
  searchParams,
}: {
  searchParams: { ppage?: string; dpage?: string; cpage?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const ppage = pageNum(searchParams.ppage);
  const dpage = pageNum(searchParams.dpage);
  const cpage = pageNum(searchParams.cpage);

  // Welcome Kit is level 0. Only kits routed to this franchise appear here —
  // every other reward level stays on the admin's own dispatch queue.
  const base = { franchiseId: session.user.id, level: WELCOME_KIT_LEVEL };
  const include = {
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
  };

  const pendingWhere: Prisma.RewardClaimWhereInput = { ...base, status: "PENDING" };
  const inFlightWhere: Prisma.RewardClaimWhereInput = { ...base, status: { in: ["APPROVED", "DISPATCHED"] } };
  const doneWhere: Prisma.RewardClaimWhereInput = { ...base, status: { in: ["DELIVERED", "REJECTED"] } };

  const [pending, pendingTotal, inFlight, inFlightTotal, done, doneTotal] = await Promise.all([
    prisma.rewardClaim.findMany({
      where: pendingWhere,
      orderBy: { requestedAt: "asc" },
      skip: (ppage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include,
    }),
    prisma.rewardClaim.count({ where: pendingWhere }),
    prisma.rewardClaim.findMany({
      where: inFlightWhere,
      orderBy: { requestedAt: "asc" },
      skip: (dpage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include,
    }),
    prisma.rewardClaim.count({ where: inFlightWhere }),
    prisma.rewardClaim.findMany({
      where: doneWhere,
      orderBy: { updatedAt: "desc" },
      skip: (cpage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include,
    }),
    prisma.rewardClaim.count({ where: doneWhere }),
  ]);

  // Carry the other sections' page numbers so paging one doesn't reset the rest.
  const others = (skip: "ppage" | "dpage" | "cpage") => ({
    ppage: skip !== "ppage" && ppage > 1 ? String(ppage) : undefined,
    dpage: skip !== "dpage" && dpage > 1 ? String(dpage) : undefined,
    cpage: skip !== "cpage" && cpage > 1 ? String(cpage) : undefined,
  });

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

      <KitSection
        title={`Awaiting your approval (${pendingTotal})`}
        claims={pending}
        total={pendingTotal}
        page={ppage}
        pageParam="ppage"
        params={others("ppage")}
        empty="No new kit claims."
      />
      <KitSection
        title={`To deliver (${inFlightTotal})`}
        claims={inFlight}
        total={inFlightTotal}
        page={dpage}
        pageParam="dpage"
        params={others("dpage")}
        empty="Nothing out for delivery."
        icon={<Truck className="h-4 w-4 text-blue-600" />}
      />
      <KitSection
        title={`Completed (${doneTotal})`}
        claims={done}
        total={doneTotal}
        page={cpage}
        pageParam="cpage"
        params={others("cpage")}
        empty="Nothing completed yet."
      />
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

function KitSection({
  title,
  claims,
  total,
  page,
  pageParam,
  params,
  empty,
  icon,
}: {
  title: string;
  claims: ClaimRow[];
  total: number;
  page: number;
  pageParam: string;
  params: Record<string, string | undefined>;
  empty: string;
  icon?: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <h2 className="font-semibold flex items-center gap-2 p-5 pb-4">
        {icon ?? <Gift className="h-4 w-4 text-franchise-600" />} {title}
      </h2>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground px-5 pb-5">{empty}</p>
      ) : (
        <>
          <div className="overflow-x-auto px-5">
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
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            basePath="/franchise/welcome-kits"
            pageParam={pageParam}
            params={params}
            variant="franchise"
          />
        </>
      )}
    </section>
  );
}
