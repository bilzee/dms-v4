/*
  Warnings:

  - You are about to drop the `incident_entities` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `incidentId` to the `rapid_assessments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."incident_entities" DROP CONSTRAINT "incident_entities_entityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."incident_entities" DROP CONSTRAINT "incident_entities_incidentId_fkey";

-- AlterTable
ALTER TABLE "rapid_assessments" ADD COLUMN     "incidentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hasTemporaryPassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temporaryPasswordCreatedAt" TIMESTAMP(3),
ADD COLUMN     "temporaryPasswordCreatedBy" TEXT;

-- DropTable
DROP TABLE "public"."incident_entities";

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "requestedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "rapid_assessments_incidentId_rapidAssessmentDate_idx" ON "rapid_assessments"("incidentId", "rapidAssessmentDate");

-- CreateIndex
CREATE INDEX "rapid_assessments_incidentId_entityId_idx" ON "rapid_assessments"("incidentId", "entityId");

-- AddForeignKey
ALTER TABLE "rapid_assessments" ADD CONSTRAINT "rapid_assessments_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
