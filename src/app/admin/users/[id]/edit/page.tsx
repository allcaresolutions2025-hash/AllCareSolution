import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminUserEditForm } from "./admin-user-edit-form";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminEditUserPage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      referralCode: true,
      nominee: true,
      gender: true,
      address: true,
      panNumber: true,
      bankAccountName: true,
      bankAccountNumber: true,
      bankIfsc: true,
      bankName: true,
      isActive: true,
      role: true,
      createdAt: true,
    },
  });
  if (!user) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Users
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Edit user</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Admin can update Name, Mobile, and Bank details (locked from members), plus other profile fields.
        </p>
      </div>

      <div className="card p-5 bg-muted/30">
        <div className="text-xs text-muted-foreground">Member ID</div>
        <div className="font-mono font-semibold">{user.referralCode}</div>
        <div className="text-xs text-muted-foreground mt-2">
          Email: <span className="font-mono">{user.email}</span> · Role: {user.role} · Joined {user.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
        </div>
      </div>

      <AdminUserEditForm
        userId={user.id}
        initial={{
          name: user.name,
          phone: user.phone ?? "",
          nominee: user.nominee ?? "",
          gender: user.gender,
          address: user.address ?? "",
          panNumber: user.panNumber ?? "",
          bankAccountName: user.bankAccountName ?? "",
          bankAccountNumber: user.bankAccountNumber ?? "",
          bankIfsc: user.bankIfsc ?? "",
          bankName: user.bankName ?? "",
          isActive: user.isActive,
        }}
      />
    </div>
  );
}
