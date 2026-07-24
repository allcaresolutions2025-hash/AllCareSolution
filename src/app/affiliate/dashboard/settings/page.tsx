import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TransactionPasswordForm } from "./transaction-password-form";
import { LoginPasswordForm } from "./login-password-form";
import { ProfileEditForm } from "./profile-edit-form";
import { LanguageForm } from "./language-form";
import { ShieldCheck, ShieldAlert, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const [me, pendingReset] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        transactionPasswordHash: true,
        mustChangePassword: true,
        mustChangeTransactionPassword: true,
        preferredLanguage: true,
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
    }),
    prisma.txnPasswordResetRequest.findFirst({
      where: { userId: session.user.id, status: "PENDING" },
      select: { id: true },
    }),
  ]);
  if (!me) return null;
  const isSet = !!me.transactionPasswordHash;
  const hasPendingResetRequest = !!pendingReset;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage security settings for your account.
        </p>
      </div>

      <div className={`card p-5 ${me.mustChangeTransactionPassword ? "bg-amber-50/40 border-amber-200" : isSet ? "bg-emerald-50/40 border-emerald-200" : "bg-amber-50/40 border-amber-200"}`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg grid place-items-center ${me.mustChangeTransactionPassword || !isSet ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            {me.mustChangeTransactionPassword || !isSet ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div>
            <div className="font-semibold">
              {me.mustChangeTransactionPassword
                ? "Transaction password reset by admin — please choose a new one"
                : isSet
                  ? "Transaction password is set"
                  : "Transaction password not yet set"}
            </div>
            <div className="text-xs text-muted-foreground">
              {me.mustChangeTransactionPassword
                ? "Use your registered mobile number as the current password, then pick a new one below."
                : isSet
                  ? "Required to transfer pins and for other sensitive actions."
                  : "You must set a transaction password before you can transfer pins."}
            </div>
          </div>
        </div>
      </div>

      <LanguageForm initial={me.preferredLanguage} />

      <LoginPasswordForm mustChange={me.mustChangePassword} />

      <TransactionPasswordForm
        isSet={isSet}
        mustChange={me.mustChangeTransactionPassword}
        hasPendingResetRequest={hasPendingResetRequest}
      />

      <div className="card p-5 bg-slate-50/40 border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center bg-slate-100 text-slate-700">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Locked fields</div>
            <div className="text-xs text-muted-foreground">
              Name, Mobile, and Bank details can only be changed by admin. Contact achtmarts2026@gmail.com to request a change.
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
