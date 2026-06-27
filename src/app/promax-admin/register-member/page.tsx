import { RegisterProMaxMemberForm } from "./register-member-form";
import { UserPlus } from "lucide-react";

export const metadata = { title: "Register Pro Max Member" };

export default function ProMaxAdminRegisterMemberPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-promax-600" /> Register Pro Max Member
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Onboard a new joiner — start a fresh tree (root) or place them under an existing Pro Max member.
          They can then log in, request pins, and build their own team.
        </p>
      </div>

      <RegisterProMaxMemberForm />
    </div>
  );
}
