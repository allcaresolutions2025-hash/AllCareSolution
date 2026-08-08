-- Admin-approved access to the payout wallet -> Pin Wallet transfer. Off for
-- everyone by default; members request it and an admin approves (or later
-- revokes) from /admin/pin-wallet-requests.
ALTER TABLE "User" ADD COLUMN "pinTopUpEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "PinTopUpAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

CREATE TABLE "PinTopUpAccessRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "PinTopUpAccessStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "PinTopUpAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PinTopUpAccessRequest_status_createdAt_idx" ON "PinTopUpAccessRequest"("status", "createdAt");
CREATE INDEX "PinTopUpAccessRequest_userId_createdAt_idx" ON "PinTopUpAccessRequest"("userId", "createdAt");

ALTER TABLE "PinTopUpAccessRequest" ADD CONSTRAINT "PinTopUpAccessRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
