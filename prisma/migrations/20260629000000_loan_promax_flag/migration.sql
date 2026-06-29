-- Pro Max (10,000-pt) loans run on a separate ladder + admin from the 1,000-pt loans.
ALTER TABLE "Loan" ADD COLUMN "proMax" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Loan_proMax_status_idx" ON "Loan"("proMax", "status");
