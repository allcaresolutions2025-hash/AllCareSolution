-- AlterTable
ALTER TABLE "LoanInstallment" ADD COLUMN "lastReminderAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "LoanInstallment_status_dueDate_idx" ON "LoanInstallment"("status", "dueDate");
