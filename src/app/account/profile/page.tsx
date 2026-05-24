import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="card p-6 space-y-4 max-w-lg">
        <Row label="Name" value={user.name} />
        <Row label="Email" value={user.email} />
        <Row label="Phone" value={user.phone || "—"} />
        <Row label="Referral code" value={user.referralCode} mono />
        <Row label="Joined" value={new Date(user.createdAt).toLocaleDateString("en-IN")} />
        <p className="text-xs text-muted-foreground">
          To change your name, phone, or password, please contact achtmarts2026@gmail.com.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`col-span-2 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
