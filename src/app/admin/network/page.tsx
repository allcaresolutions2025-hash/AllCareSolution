import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatINR, formatINRCompact } from "@/lib/money";
import { MAX_DOWNLINE_DEPTH } from "@/lib/network";
import { Users, Network, TrendingUp, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type LeaderRow = {
  root_id: string;
  name: string;
  email: string;
  referral_code: string;
  team_size: bigint;
  active_in_team: bigint;
  team_sales: bigint;
};

export default async function AdminNetworkPage() {
  const [leaders, totalUsers, usersWithReferrer, topEarners, recentJoins, networkStats] = await Promise.all([
    // Per-sponsor leaderboard via single recursive CTE (root_id, team_size, team_sales).
    prisma.$queryRaw<LeaderRow[]>`
      WITH RECURSIVE all_lines AS (
        SELECT "referrerId" AS root_id, id AS descendant_id, 1 AS depth
        FROM "User" WHERE "referrerId" IS NOT NULL
        UNION ALL
        SELECT a.root_id, u.id, a.depth + 1
        FROM all_lines a
        JOIN "User" u ON u."referrerId" = a.descendant_id
        WHERE a.depth < ${MAX_DOWNLINE_DEPTH}
      )
      SELECT
        al.root_id,
        u.name,
        u.email,
        u."referralCode" AS referral_code,
        COUNT(DISTINCT al.descendant_id) AS team_size,
        COUNT(DISTINCT al.descendant_id) FILTER (WHERE du."isActive") AS active_in_team,
        COALESCE(SUM(CASE WHEN o.status IN ('PAID','SHIPPED','DELIVERED') THEN o."totalAmount" ELSE 0 END), 0) AS team_sales
      FROM all_lines al
      JOIN "User" u ON u.id = al.root_id
      JOIN "User" du ON du.id = al.descendant_id
      LEFT JOIN "Order" o ON o."userId" = al.descendant_id
      GROUP BY al.root_id, u.name, u.email, u."referralCode"
      ORDER BY team_size DESC, team_sales DESC
      LIMIT 25
    `,
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", referrerId: { not: null } } }),
    prisma.commission.groupBy({
      by: ["beneficiaryId"],
      where: { status: { in: ["AVAILABLE", "REQUESTED", "PAID"] } },
      _sum: { commissionAmount: true },
      orderBy: { _sum: { commissionAmount: "desc" } },
      take: 10,
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isActive: true,
        referrer: { select: { id: true, name: true, referralCode: true } },
      },
    }),
    prisma.$queryRaw<Array<{ max_depth: number | null; sponsors: bigint; unreferred: bigint }>>`
      WITH RECURSIVE depths AS (
        SELECT id, "referrerId", 0 AS depth
        FROM "User" WHERE "referrerId" IS NULL
        UNION ALL
        SELECT u.id, u."referrerId", d.depth + 1
        FROM "User" u
        JOIN depths d ON u."referrerId" = d.id
        WHERE d.depth < ${MAX_DOWNLINE_DEPTH}
      )
      SELECT
        MAX(depth) AS max_depth,
        (SELECT COUNT(DISTINCT "referrerId") FROM "User" WHERE "referrerId" IS NOT NULL) AS sponsors,
        (SELECT COUNT(*) FROM "User" WHERE "referrerId" IS NULL AND role = 'CUSTOMER') AS unreferred
      FROM depths
    `,
  ]);

  const earnerIds = topEarners.map((e) => e.beneficiaryId);
  const earnerUsers = earnerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: earnerIds } },
        select: { id: true, name: true, email: true, referralCode: true },
      })
    : [];
  const earnerById = new Map(earnerUsers.map((u) => [u.id, u]));

  const stats = networkStats[0] ?? { max_depth: 0, sponsors: BigInt(0), unreferred: BigInt(0) };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Network Monitor</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Read-only view of the referral network. Drill into any user to see their downline tree.
        </p>
      </div>

      <div className="card border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 flex gap-2">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          Commissions are accrued only when downline members <strong>purchase products</strong>, at 20% (L1) and 5% (L2) of the
          pre-GST subtotal — see <code className="text-xs bg-white/60 px-1 rounded">src/lib/commission.ts</code>. There is no
          enrollment-based payout in this system.
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Users className="h-5 w-5" />} label="Customers" value={String(totalUsers)} />
        <Kpi icon={<Network className="h-5 w-5" />} label="With a sponsor" value={String(usersWithReferrer)} sub={`${totalUsers - usersWithReferrer} unreferred`} />
        <Kpi icon={<Network className="h-5 w-5" />} label="Sponsors (>=1 direct)" value={String(stats.sponsors)} />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Max network depth" value={`L${stats.max_depth ?? 0}`} sub={`cap L${MAX_DOWNLINE_DEPTH}`} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Top sponsors by team size</h2>
            <p className="text-xs text-muted-foreground">Across all 15 levels. Click a row to drill into their tree.</p>
          </div>
        </div>
        {leaders.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No referral activity yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">#</th>
                  <th className="text-left px-5 py-2 font-medium">Sponsor</th>
                  <th className="text-left px-5 py-2 font-medium">Code</th>
                  <th className="text-right px-5 py-2 font-medium">Team</th>
                  <th className="text-right px-5 py-2 font-medium">Active</th>
                  <th className="text-right px-5 py-2 font-medium">Team sales</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((row, i) => (
                  <tr key={row.root_id} className="border-t hover:bg-muted/30">
                    <td className="px-5 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-5 py-2">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                    </td>
                    <td className="px-5 py-2 font-mono text-xs">{row.referral_code}</td>
                    <td className="text-right px-5 py-2 font-medium">{Number(row.team_size)}</td>
                    <td className="text-right px-5 py-2">{Number(row.active_in_team)}</td>
                    <td className="text-right px-5 py-2">{formatINRCompact(Number(row.team_sales))}</td>
                    <td className="text-right px-5 py-2">
                      <Link href={`/admin/network/${row.root_id}`} className="text-brand-700 hover:underline text-xs">
                        view tree →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="font-semibold">Top earners (commissions on actual sales)</h2>
            <p className="text-xs text-muted-foreground">AVAILABLE + REQUESTED + PAID. PENDING is excluded.</p>
          </div>
          {topEarners.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No commissions yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">User</th>
                  <th className="text-right px-5 py-2 font-medium">Earned</th>
                </tr>
              </thead>
              <tbody>
                {topEarners.map((e) => {
                  const u = earnerById.get(e.beneficiaryId);
                  return (
                    <tr key={e.beneficiaryId} className="border-t">
                      <td className="px-5 py-2">
                        <Link href={`/admin/network/${e.beneficiaryId}`} className="hover:underline">
                          <div className="font-medium">{u?.name ?? "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{u?.email}</div>
                        </Link>
                      </td>
                      <td className="text-right px-5 py-2 font-medium text-brand-700">{formatINR(e._sum.commissionAmount ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="font-semibold">Recent joins</h2>
            <p className="text-xs text-muted-foreground">Newest 15 customers and who referred them.</p>
          </div>
          {recentJoins.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No customers yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">User</th>
                  <th className="text-left px-5 py-2 font-medium">Sponsor</th>
                  <th className="text-right px-5 py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentJoins.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-5 py-2">
                      <Link href={`/admin/network/${u.id}`} className="hover:underline">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-2 text-xs">
                      {u.referrer ? (
                        <Link href={`/admin/network/${u.referrer.id}`} className="hover:underline">
                          {u.referrer.name} <span className="text-muted-foreground">({u.referrer.referralCode})</span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">— direct signup —</span>
                      )}
                    </td>
                    <td className="text-right px-5 py-2 text-xs text-muted-foreground">
                      {u.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit", timeZone: "Asia/Kolkata" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="h-9 w-9 rounded-lg bg-brand-100 text-brand-700 grid place-items-center">{icon}</div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}{sub && ` · ${sub}`}</div>
    </div>
  );
}
