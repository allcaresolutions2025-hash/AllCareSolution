import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LoginPasswordForm } from "@/app/affiliate/dashboard/settings/login-password-form";
import { ProfileEditForm } from "@/app/affiliate/dashboard/settings/profile-edit-form";
import { Settings as SettingsIcon, Lock } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pro Max Settings" };

export default async function ProMaxSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      mustChangePassword: true,
      name: true,
      email: true,
      phone: true,
      whatsappNumber: true,
      nominee: true,
      gender: true,
      address: true,
      panNumber: true,
      bankAccountName: true,
      bankAccountNumber: true,
      bankIfsc: true,
      bankName: true,
    },
  });
  if (!me) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-promax-600" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your Pro Max account security and profile.
        </p>
      </div>

      <LoginPasswordForm mustChange={me.mustChangePassword} />

      <div className="card p-5 bg-slate-50/40 border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-slate-100 text-slate-700">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Locked fields</div>
            <div className="text-xs text-muted-foreground">
              Name, Mobile, and Bank details can only be changed by admin. Contact the Pro Max admin to request a change.
            </div>
          </div>
        </div>
      </div>

      <ProfileEditForm
        initial={{
          email: me.email,
          name: me.name,
          phone: me.phone,
          whatsappNumber: me.whatsappNumber,
          nominee: me.nominee,
          gender: me.gender,
          address: me.address,
          panNumber: me.panNumber,
          bankAccountName: me.bankAccountName,
          bankAccountNumber: me.bankAccountNumber,
          bankIfsc: me.bankIfsc,
          bankName: me.bankName,
        }}
      />
    </div>
  );
}
