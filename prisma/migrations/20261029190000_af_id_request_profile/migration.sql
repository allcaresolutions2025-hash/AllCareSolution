-- AF ID requests collect the new account's own PAN, nominee, gender and
-- address instead of copying the requester's. Additive only.
ALTER TABLE "AfIdRequest" ADD COLUMN "nominee" TEXT,
ADD COLUMN "gender" "Gender",
ADD COLUMN "address" TEXT,
ADD COLUMN "panNumber" TEXT;
