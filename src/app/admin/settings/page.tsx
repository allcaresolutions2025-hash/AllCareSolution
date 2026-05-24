import { getAllBusinessSettings } from "@/lib/settings";
import { getSiteBrand } from "@/lib/brand";
import { SettingsForm } from "./settings-form";
import { BrandingForm } from "./branding-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, brand] = await Promise.all([
    getAllBusinessSettings(),
    getSiteBrand(),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Site &amp; Business Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your branding (logo, name, tagline) and the business rules that apply to new commissions and payouts.
        </p>
      </div>

      <BrandingForm initial={brand} />

      <div>
        <h2 className="text-lg font-semibold">Business rules</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          These never retroactively change historical commissions.
        </p>
        <SettingsForm initial={settings} />
      </div>
    </div>
  );
}
