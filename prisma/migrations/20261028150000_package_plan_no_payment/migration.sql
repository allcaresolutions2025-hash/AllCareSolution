-- Package Plan has no payment step: members request a package and the admin
-- verifies and approves it. Drop the payment columns added in
-- 20261028120000_package_plan (no rows existed when this was written).
ALTER TABLE "PackagePurchase" DROP COLUMN "paymentMethod",
DROP COLUMN "paymentRef";

DROP TYPE "PackagePaymentMethod";
