-- Pin Wallet loan payments now await admin approval in the same queue as receipts.
ALTER TABLE "LoanInstallment" ADD COLUMN "paidViaWallet" BOOLEAN NOT NULL DEFAULT false;
