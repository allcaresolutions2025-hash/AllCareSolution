-- New AF IDs cost a fee (AF_ID_FEE_POINTS), paid offline and confirmed by the admin on approval.
ALTER TABLE "AfIdRequest" ADD COLUMN "fee" INTEGER NOT NULL DEFAULT 0;
