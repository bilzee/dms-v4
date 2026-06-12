/*
  Warnings:

  - You are about to drop the column `hasTemporaryPassword` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `temporaryPasswordCreatedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `temporaryPasswordCreatedBy` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `password_reset_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `password_reset_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('ASSESSMENT', 'RESPONSE', 'ENTITY', 'DONOR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'CSV', 'HTML', 'EXCEL');

-- DropForeignKey
ALTER TABLE "public"."password_reset_requests" DROP CONSTRAINT "password_reset_requests_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_userId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "hasTemporaryPassword",
DROP COLUMN "temporaryPasswordCreatedAt",
DROP COLUMN "temporaryPasswordCreatedBy";

-- DropTable
DROP TABLE "public"."password_reset_requests";

-- DropTable
DROP TABLE "public"."password_reset_tokens";

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ReportType" NOT NULL DEFAULT 'CUSTOM',
    "layout" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_configurations" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "aggregations" JSONB NOT NULL,
    "visualizations" JSONB NOT NULL,
    "schedule" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_executions" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "status" "ReportExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "format" "ReportFormat" NOT NULL,
    "filePath" TEXT,
    "generatedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gap_field_severities" (
    "id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "assessment_type" "AssessmentType" NOT NULL,
    "severity" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "gap_field_severities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_assessment_type" ON "gap_field_severities"("assessment_type");

-- CreateIndex
CREATE INDEX "idx_severity" ON "gap_field_severities"("severity");

-- CreateIndex
CREATE INDEX "idx_active" ON "gap_field_severities"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "gap_field_severities_field_name_assessment_type_key" ON "gap_field_severities"("field_name", "assessment_type");

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_configurations" ADD CONSTRAINT "report_configurations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "report_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_configurations" ADD CONSTRAINT "report_configurations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "report_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gap_field_severities" ADD CONSTRAINT "gap_field_severities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gap_field_severities" ADD CONSTRAINT "gap_field_severities_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
