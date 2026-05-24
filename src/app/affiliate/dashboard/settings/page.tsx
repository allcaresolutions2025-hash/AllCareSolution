import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TransactionPasswordForm } from "./transaction-password-form";
import { LoginPasswordForm } from "./login-password-form";
import { ProfileEditForm } from "./profile-edit-form";
import { ShieldCheck, ShieldAlert, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      transactionPasswordHash: true,
      mustChangePassword: true,
      name: true,
      email: true,
      phone: true,
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
  const isSet = !!me.transactionPasswordHash;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage security settings for your account.
        </p>
      </div>

      <div className={`card p-5 ${isSet ? "bg-emerald-50/40 border-emerald-200" : "bg-amber-50/40 border-amber-200"}`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg grid place-items-center ${isSet ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {isSet ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <div>
            <div className="font-semibold">
              {isSet ? "Transaction password is set" : "Transaction password not yet set"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isSet
                ? "Required to transfer pins and for other sensitive actions."
                : "You must set a transaction password before you can transfer pins."}
            </div>
          </div>
        </div>
      </div>

      <LoginPasswordForm mustChange={me.mustChangePassword} />

      <TransactionPasswordForm isSet={isSet} />

      <div className="card p-5 bg-slate-50/40 border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-slate-100 text-slate-700">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Locked fields</div>
            <div className="text-xs text-muted-foreground">
              Name, Mobile, and Bank details can only be changed by admin. Contact support@achtmart.com to request a change.
            </div>
          </div>
        </div>
      </div>

      <ProfileEditForm
        initial={{
          email: me.email,
          name: me.name,
          phone: me.phone,
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
