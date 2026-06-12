-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ASSESSOR', 'COORDINATOR', 'RESPONDER', 'DONOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('COMMUNITY', 'WARD', 'LGA', 'STATE', 'FACILITY', 'CAMP');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION');

-- CreateEnum
CREATE TYPE "ResponseType" AS ENUM ('HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'LOGISTICS');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('PLANNED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT', 'LOCAL');

-- CreateEnum
CREATE TYPE "DonorType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION', 'GOVERNMENT', 'NGO', 'CORPORATE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('ACTIVE', 'CONTAINED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('PLANNED', 'PARTIAL', 'COMPLETE', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EntityType" NOT NULL,
    "location" TEXT,
    "coordinates" JSONB,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoApproveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "entity_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subType" TEXT,
    "severity" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "IncidentStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "coordinates" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preliminary_assessments" (
    "id" TEXT NOT NULL,
    "reportingDate" TIMESTAMP(3) NOT NULL,
    "reportingLatitude" DOUBLE PRECISION NOT NULL,
    "reportingLongitude" DOUBLE PRECISION NOT NULL,
    "reportingLGA" TEXT NOT NULL,
    "reportingWard" TEXT NOT NULL,
    "numberLivesLost" INTEGER NOT NULL DEFAULT 0,
    "numberInjured" INTEGER NOT NULL DEFAULT 0,
    "numberDisplaced" INTEGER NOT NULL DEFAULT 0,
    "numberHousesAffected" INTEGER NOT NULL DEFAULT 0,
    "numberSchoolsAffected" INTEGER NOT NULL DEFAULT 0,
    "schoolsAffected" TEXT,
    "numberMedicalFacilitiesAffected" INTEGER NOT NULL DEFAULT 0,
    "medicalFacilitiesAffected" TEXT,
    "estimatedAgriculturalLandsAffected" TEXT,
    "reportingAgent" TEXT NOT NULL,
    "additionalDetails" JSONB,
    "incidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preliminary_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_entities" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "affectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" "Priority" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "incident_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapid_assessments" (
    "id" TEXT NOT NULL,
    "rapidAssessmentType" "AssessmentType" NOT NULL,
    "rapidAssessmentDate" TIMESTAMP(3) NOT NULL,
    "assessorId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "assessorName" TEXT NOT NULL,
    "location" TEXT,
    "coordinates" JSONB,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "isOfflineCreated" BOOLEAN NOT NULL DEFAULT false,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "rejectionFeedback" TEXT,
    "mediaAttachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rapid_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_assessments" (
    "rapidAssessmentId" TEXT NOT NULL,
    "hasFunctionalClinic" BOOLEAN NOT NULL,
    "hasEmergencyServices" BOOLEAN NOT NULL,
    "numberHealthFacilities" INTEGER NOT NULL,
    "healthFacilityType" TEXT NOT NULL,
    "qualifiedHealthWorkers" INTEGER NOT NULL,
    "hasTrainedStaff" BOOLEAN NOT NULL,
    "hasMedicineSupply" BOOLEAN NOT NULL,
    "hasMedicalSupplies" BOOLEAN NOT NULL,
    "hasMaternalChildServices" BOOLEAN NOT NULL,
    "commonHealthIssues" TEXT NOT NULL DEFAULT '[]',
    "additionalHealthDetails" JSONB,

    CONSTRAINT "health_assessments_pkey" PRIMARY KEY ("rapidAssessmentId")
);

-- CreateTable
CREATE TABLE "population_assessments" (
    "rapidAssessmentId" TEXT NOT NULL,
    "totalHouseholds" INTEGER NOT NULL,
    "totalPopulation" INTEGER NOT NULL,
    "populationMale" INTEGER NOT NULL,
    "populationFemale" INTEGER NOT NULL,
    "populationUnder5" INTEGER NOT NULL,
    "pregnantWomen" INTEGER NOT NULL,
    "lactatingMothers" INTEGER NOT NULL,
    "personWithDisability" INTEGER NOT NULL,
    "elderlyPersons" INTEGER NOT NULL,
    "separatedChildren" INTEGER NOT NULL,
    "numberLivesLost" INTEGER NOT NULL,
    "numberInjured" INTEGER NOT NULL,
    "additionalPopulationDetails" TEXT,

    CONSTRAINT "population_assessments_pkey" PRIMARY KEY ("rapidAssessmentId")
);

-- CreateTable
CREATE TABLE "food_assessments" (
    "rapidAssessmentId" TEXT NOT NULL,
    "isFoodSufficient" BOOLEAN NOT NULL,
    "hasRegularMealAccess" BOOLEAN NOT NULL,
    "hasInfantNutrition" BOOLEAN NOT NULL,
    "foodSource" TEXT NOT NULL DEFAULT '[]',
    "availableFoodDurationDays" INTEGER NOT NULL,
    "additionalFoodRequiredPersons" INTEGER NOT NULL,
    "additionalFoodRequiredHouseholds" INTEGER NOT NULL,
    "additionalFoodDetails" JSONB,

    CONSTRAINT "food_assessments_pkey" PRIMARY KEY ("rapidAssessmentId")
);

-- CreateTable
CREATE TABLE "wash_assessments" (
    "rapidAssessmentId" TEXT NOT NULL,
    "waterSource" TEXT NOT NULL DEFAULT '[]',
    "isWaterSufficient" BOOLEAN NOT NULL,
    "hasCleanWaterAccess" BOOLEAN NOT NULL,
    "functionalLatrinesAvailable" INTEGER NOT NULL,
    "areLatrinesSufficient" BOOLEAN NOT NULL,
    "hasHandwashingFacilities" BOOLEAN NOT NULL,
    "hasOpenDefecationConcerns" BOOLEAN NOT NULL,
    "additionalWashDetails" JSONB,

    CONSTRAINT "wash_assessments_pkey" PRIMARY KEY ("rapidAssessmentId")
);

-- CreateTable
CREATE TABLE "shelter_assessments" (
    "rapidAssessmentId" TEXT NOT NULL,
    "areSheltersSufficient" BOOLEAN NOT NULL,
    "hasSafeStructures" BOOLEAN NOT NULL,
    "shelterTypes" TEXT NOT NULL DEFAULT '[]',
    "requiredShelterType" TEXT NOT NULL DEFAULT '[]',
    "numberSheltersRequired" INTEGER NOT NULL,
    "areOvercrowded" BOOLEAN NOT NULL,
    "provideWeatherProtection" BOOLEAN NOT NULL,
    "additionalShelterDetails" JSONB,

    CONSTRAINT "shelter_assessments_pkey" PRIMARY KEY ("rapidAssessmentId")
);

-- CreateTable
CREATE TABLE "security_assessments" (
    "rapidAssessmentId" TEXT NOT NULL,
    "isSafeFromViolence" BOOLEAN NOT NULL,
    "gbvCasesReported" BOOLEAN NOT NULL,
    "hasSecurityPresence" BOOLEAN NOT NULL,
    "hasProtectionReportingMechanism" BOOLEAN NOT NULL,
    "vulnerableGroupsHaveAccess" BOOLEAN NOT NULL,
    "hasLighting" BOOLEAN NOT NULL,
    "additionalSecurityDetails" JSONB,

    CONSTRAINT "security_assessments_pkey" PRIMARY KEY ("rapidAssessmentId")
);

-- CreateTable
CREATE TABLE "rapid_responses" (
    "id" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "type" "ResponseType" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ResponseStatus" NOT NULL DEFAULT 'PLANNED',
    "description" TEXT,
    "resources" JSONB,
    "timeline" JSONB,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "isOfflineCreated" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "donorId" TEXT,
    "commitmentId" TEXT,
    "items" JSONB NOT NULL,
    "offlineId" TEXT,
    "plannedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejectionFeedback" TEXT,
    "rejectionReason" TEXT,
    "responseDate" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'LOCAL',

    CONSTRAINT "rapid_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DonorType" NOT NULL DEFAULT 'ORGANIZATION',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "organization" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donor_commitments" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "status" "CommitmentStatus" NOT NULL DEFAULT 'PLANNED',
    "items" JSONB NOT NULL,
    "totalCommittedQuantity" INTEGER NOT NULL DEFAULT 0,
    "deliveredQuantity" INTEGER NOT NULL DEFAULT 0,
    "verifiedDeliveredQuantity" INTEGER NOT NULL DEFAULT 0,
    "commitmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "donor_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_attachments" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "media_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_conflicts" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "conflictDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolutionMethod" TEXT NOT NULL DEFAULT 'LAST_WRITE_WINS',
    "winningVersion" JSONB NOT NULL,
    "losingVersion" JSONB NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coordinatorNotified" BOOLEAN NOT NULL DEFAULT false,
    "coordinatorNotifiedAt" TIMESTAMP(3),
    "responseId" TEXT,

    CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "user_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "entities_name_type_key" ON "entities"("name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "entity_assignments_userId_entityId_key" ON "entity_assignments"("userId", "entityId");

-- CreateIndex
CREATE INDEX "incident_entities_incidentId_idx" ON "incident_entities"("incidentId");

-- CreateIndex
CREATE INDEX "incident_entities_entityId_idx" ON "incident_entities"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_entities_incidentId_entityId_key" ON "incident_entities"("incidentId", "entityId");

-- CreateIndex
CREATE INDEX "rapid_assessments_rapidAssessmentType_rapidAssessmentDate_e_idx" ON "rapid_assessments"("rapidAssessmentType", "rapidAssessmentDate", "entityId");

-- CreateIndex
CREATE INDEX "rapid_assessments_entityId_rapidAssessmentDate_idx" ON "rapid_assessments"("entityId", "rapidAssessmentDate");

-- CreateIndex
CREATE INDEX "rapid_assessments_assessorId_createdAt_idx" ON "rapid_assessments"("assessorId", "createdAt");

-- CreateIndex
CREATE INDEX "rapid_assessments_status_priority_idx" ON "rapid_assessments"("status", "priority");

-- CreateIndex
CREATE INDEX "rapid_assessments_createdAt_rapidAssessmentType_idx" ON "rapid_assessments"("createdAt", "rapidAssessmentType");

-- CreateIndex
CREATE INDEX "rapid_assessments_rapidAssessmentDate_rapidAssessmentType_idx" ON "rapid_assessments"("rapidAssessmentDate", "rapidAssessmentType");

-- CreateIndex
CREATE INDEX "rapid_assessments_syncStatus_isOfflineCreated_idx" ON "rapid_assessments"("syncStatus", "isOfflineCreated");

-- CreateIndex
CREATE UNIQUE INDEX "rapid_responses_offlineId_key" ON "rapid_responses"("offlineId");

-- CreateIndex
CREATE INDEX "rapid_responses_commitmentId_idx" ON "rapid_responses"("commitmentId");

-- CreateIndex
CREATE INDEX "donor_commitments_donorId_entityId_idx" ON "donor_commitments"("donorId", "entityId");

-- CreateIndex
CREATE INDEX "donor_commitments_donorId_incidentId_idx" ON "donor_commitments"("donorId", "incidentId");

-- CreateIndex
CREATE INDEX "donor_commitments_status_idx" ON "donor_commitments"("status");

-- CreateIndex
CREATE INDEX "donor_commitments_entityId_incidentId_idx" ON "donor_commitments"("entityId", "incidentId");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_assignments" ADD CONSTRAINT "entity_assignments_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_assignments" ADD CONSTRAINT "entity_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preliminary_assessments" ADD CONSTRAINT "preliminary_assessments_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_entities" ADD CONSTRAINT "incident_entities_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_entities" ADD CONSTRAINT "incident_entities_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapid_assessments" ADD CONSTRAINT "rapid_assessments_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapid_assessments" ADD CONSTRAINT "rapid_assessments_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_assessments" ADD CONSTRAINT "health_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES "rapid_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "population_assessments" ADD CONSTRAINT "population_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES "rapid_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_assessments" ADD CONSTRAINT "food_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES "rapid_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wash_assessments" ADD CONSTRAINT "wash_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES "rapid_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelter_assessments" ADD CONSTRAINT "shelter_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES "rapid_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_assessments" ADD CONSTRAINT "security_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES "rapid_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapid_responses" ADD CONSTRAINT "rapid_responses_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "rapid_assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapid_responses" ADD CONSTRAINT "rapid_responses_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapid_responses" ADD CONSTRAINT "rapid_responses_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "donor_commitments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapid_responses" ADD CONSTRAINT "rapid_responses_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapid_responses" ADD CONSTRAINT "rapid_responses_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donor_commitments" ADD CONSTRAINT "donor_commitments_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donor_commitments" ADD CONSTRAINT "donor_commitments_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donor_commitments" ADD CONSTRAINT "donor_commitments_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "rapid_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "rapid_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

