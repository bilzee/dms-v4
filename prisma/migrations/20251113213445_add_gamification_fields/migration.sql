-- AlterTable
ALTER TABLE "donor_commitments" ADD COLUMN     "totalValueEstimated" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "donors" ADD COLUMN     "leaderboardRank" INTEGER DEFAULT 0,
ADD COLUMN     "selfReportedDeliveryRate" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "verifiedDeliveryRate" DOUBLE PRECISION DEFAULT 0;
