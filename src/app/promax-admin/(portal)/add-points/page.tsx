import Link from "next/link";
import { AddPointsForm } from "./add-points-form";
import { WalletCards } from "lucide-react";

export const metadata = { title: "Add Points" };

export default function ProMaxAdminAddPointsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <WalletCards className="h-6 w-6 text-promax-600" /> Add Points
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Credit a member&apos;s Pin Wallet or Pro Max points by their Member ID. To browse all members and
          their balances, use <Link href="/promax-admin/members" className="text-promax-700 hover:underline">Members &amp; Wallets</Link>.
        </p>
      </div>

      <AddPointsForm />
    </div>
  );
}
