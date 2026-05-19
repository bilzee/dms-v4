# 6. Database Schema (Prisma)

### 6.1 Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// USER MANAGEMENT
// ============================================

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  username     String   @unique
  passwordHash String   @map("password_hash")
  name         String
  phone        String?
  organization String?
  
  // Status
  isActive Boolean @default(true) @map("is_active")
  isLocked Boolean @default(false) @map("is_locked")
  lastLogin DateTime? @map("last_login")
  
  // Relationships
  roles                UserRole[]
  createdAssessments   RapidAssessment[] @relation("AssessorRelation")
  createdResponses     RapidResponse[] @relation("ResponderRelation")
  entityAssignments    EntityAssignment[]
  auditLogs            AuditLog[]
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([email])
  @@index([username])
  @@map("users")
}

model Role {
  id          String   @id @default(uuid())
  name        RoleName @unique
  description String
  
  // Relationships
  userRoles   UserRole[]
  permissions Permission[]
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@map("roles")
}

model UserRole {
  id     String @id @default(uuid())
  userId String @map("user_id")
  roleId String @map("role_id")
  
  // Relationships
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  // Metadata
  assignedAt Date @default(now()) @map("assigned_at")
  assignedBy String @map("assigned_by")
  
  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
  @@map("user_roles")
}

model Permission {
  id          String @id @default(uuid())
  name        String
  code        String @unique
  category    String
  description String
  
  // Relationships
  roles Role[]
  
  @@index([category])
  @@map("permissions")
}

enum RoleName {
  ASSESSOR
  COORDINATOR
  RESPONDER
  DONOR
  ADMIN
}

// ============================================
// INCIDENT MANAGEMENT
// ============================================

model Incident {
  id              String          @id @default(uuid())
  name            String
  type            IncidentType
  subType         String?         @map("sub_type")
  severity        IncidentSeverity
  status          IncidentStatus
  
  // Dates
  declarationDate Date            @map("declaration_date")
  containedDate   DateTime?       @map("contained_date")
  resolvedDate    DateTime?       @map("resolved_date")
  
  // Location (optional - may be wide area)
  locationLat     Float?          @map("location_lat")
  locationLng     Float?          @map("location_lng")
  
  // Impact (aggregated)
  affectedPopulation Int?         @map("affected_population")
  
  // Relationships
  preliminaryAssessments PreliminaryAssessment[]
  affectedEntities       IncidentEntity[]
  
  // Metadata
  createdBy String    @map("created_by")
  updatedBy String?   @map("updated_by")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  
  @@index([status])
  @@index([declarationDate])
  @@map("incidents")
}

model PreliminaryAssessment {
  id          String   @id @default(uuid())
  incidentId  String?  @map("incident_id") // Nullable
  
  // Assessment details
  assessmentDate   Date   @map("assessment_date")
  assessorId       String @map("assessor_id")
  impactDescription String @map("impact_description") @db.Text
  initialNeeds     String @map("initial_needs") @db.Text
  
  // Trigger
  canTriggerIncident Boolean @default(false) @map("can_trigger_incident")
  
  // Status
  verificationStatus VerificationStatus @default(PENDING) @map("verification_status")
  
  // Impact numbers
  livesLost      Int @default(0) @map("lives_lost")
  injured        Int @default(0)
  displaced      Int @default(0)
  housesAffected Int @default(0) @map("houses_affected")
  
  // Location
  locationLat Float  @map("location_lat")
  locationLng Float  @map("location_lng")
  lga         String
  ward        String
  
  // Relationships
  incident Incident? @relation(fields: [incidentId], references: [id])
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([incidentId])
  @@index([assessmentDate])
  @@map("preliminary_assessments")
}

enum IncidentType {
  FLOOD
  FIRE
  LANDSLIDE
  CYCLONE
  CONFLICT
  EPIDEMIC
  OTHER
}

enum IncidentSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum IncidentStatus {
  ACTIVE
  CONTAINED
  RESOLVED
}

// ============================================
// AFFECTED ENTITIES
// ============================================

model AffectedEntity {
  id   String     @id @default(uuid())
  name String
  type EntityType
  
  // Location
  locationLat Float @map("location_lat")
  locationLng Float @map("location_lng")
  lga         String
  ward        String
  
  // Population (from latest assessment)
  population       Int? @default(0)
  vulnerableCount  Int? @default(0) @map("vulnerable_count")
  
  // Auto-approval
  autoApproveEnabled Boolean @default(false) @map("auto_approve_enabled")
  
  // Type-specific details (JSON)
  campDetails      Json? @map("camp_details")
  communityDetails Json? @map("community_details")
  
  // Relationships
  incidents     IncidentEntity[]
  assessments   RapidAssessment[]
  responses     RapidResponse[]
  assignments   EntityAssignment[]
  commitments   DonorCommitment[]
  
  // Metadata
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([type])
  @@index([lga, ward])
  @@index([locationLat, locationLng])
  @@map("affected_entities")
}

model IncidentEntity {
  incidentId String @map("incident_id")
  entityId   String @map("entity_id")
  
  // Impact
  affectedDate Date             @map("affected_date")
  severityLevel IncidentSeverity @map("severity_level")
  
  // Relationships
  incident Incident       @relation(fields: [incidentId], references: [id])
  entity   AffectedEntity @relation(fields: [entityId], references: [id])
  
  @@id([incidentId, entityId])
  @@index([incidentId])
  @@index([entityId])
  @@map("incident_entities")
}

model EntityAssignment {
  id       String         @id @default(uuid())
  entityId String         @map("entity_id")
  userId   String         @map("user_id")
  role     AssignmentRole
  
  // Status
  isActive Boolean @default(true) @map("is_active")
  
  // Relationships
  entity AffectedEntity @relation(fields: [entityId], references: [id])
  user   User           @relation(fields: [userId], references: [id])
  
  // Metadata
  assignedBy String   @map("assigned_by")
  assignedAt DateTime @default(now()) @map("assigned_at")
  
  @@unique([entityId, userId, role])
  @@index([entityId])
  @@index([userId])
  @@map("entity_assignments")
}

enum EntityType {
  CAMP
  COMMUNITY
}

enum AssignmentRole {
  ASSESSOR
  RESPONDER
  DONOR
}

// ============================================
// RAPID ASSESSMENTS
// ============================================

model RapidAssessment {
  id             String         @id @default(uuid())
  entityId       String         @map("entity_id")
  incidentId     String         @map("incident_id")
  assessorId     String         @map("assessor_id")
  assessmentType AssessmentType @map("assessment_type")
  assessmentDate Date           @map("assessment_date")
  
  // Status
  verificationStatus VerificationStatus @default(PENDING) @map("verification_status")
  rejectionReason    String?            @map("rejection_reason")
  rejectionFeedback  String?            @db.Text @map("rejection_feedback")
  syncStatus         SyncStatus         @default(LOCAL) @map("sync_status")
  
  // Offline tracking
  offlineId     String? @unique @map("offline_id")
  versionNumber Int     @default(1) @map("version_number")
  
  // Assessment data (type-specific JSON)
  assessmentData Json @map("assessment_data")
  
  // Relationships
  affectedEntity   AffectedEntity    @relation(fields: [entityId], references: [id])
  incident         Incident          @relation(fields: [incidentId], references: [id])
  assessor         User              @relation("AssessorRelation", fields: [assessorId], references: [id])
  responses        RapidResponse[]
  mediaAttachments MediaAttachment[]
  conflicts        SyncConflict[]
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([entityId])
  @@index([incidentId])
  @@index([assessorId])
  @@index([assessmentType])
  @@index([verificationStatus])
  @@index([syncStatus])
  @@map("rapid_assessments")
}

enum AssessmentType {
  HEALTH
  WASH
  SHELTER
  FOOD
  SECURITY
  POPULATION
}

// ============================================
// RAPID RESPONSES
// ============================================

model RapidResponse {
  id           String         @id @default(uuid())
  assessmentId String         @map("assessment_id")
  entityId     String         @map("entity_id")
  responderId  String         @map("responder_id")
  donorId      String?        @map("donor_id") // Nullable
  
  // Status
  status             ResponseStatus     @default(PLANNED)
  plannedDate        Date               @map("planned_date")
  responseDate       DateTime?          @map("response_date")
  
  // Verification
  verificationStatus VerificationStatus @default(DRAFT) @map("verification_status")
  rejectionReason    String?            @map("rejection_reason")
  rejectionFeedback  String?            @db.Text @map("rejection_feedback")
  syncStatus         SyncStatus         @default(LOCAL) @map("sync_status")
  
  // Offline tracking
  offlineId     String? @unique @map("offline_id")
  versionNumber Int     @default(1) @map("version_number")
  
  // Response items (JSON array)
  items Json
  
  // Relationships
  assessment       RapidAssessment     @relation(fields: [assessmentId], references: [id])
  affectedEntity   AffectedEntity      @relation(fields: [entityId], references: [id])
  responder        User                @relation("ResponderRelation", fields: [responderId], references: [id])
  donor            Donor?              @relation(fields: [donorId], references: [id])
  mediaAttachments MediaAttachment[]
  conflicts        SyncConflict[]
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([assessmentId])
  @@index([entityId])
  @@index([responderId])
  @@index([donorId])
  @@index([status])
  @@index([verificationStatus])
  @@index([syncStatus])
  @@map("rapid_responses")
}

enum ResponseStatus {
  PLANNED
  DELIVERED
}

enum VerificationStatus {
  DRAFT
  PENDING
  VERIFIED
  AUTO_VERIFIED
  REJECTED
}

enum SyncStatus {
  LOCAL
  SYNCING
  SYNCED
  CONFLICT
  FAILED
}

// ============================================
// DONOR MANAGEMENT
// ============================================

model Donor {
  id               String   @id @default(uuid())
  organizationName String   @map("organization_name")
  contactName      String   @map("contact_name")
  email            String   @unique
  phone            String?
  
  // Performance metrics (calculated)
  totalCommitments          Int   @default(0) @map("total_commitments")
  totalDelivered            Int   @default(0) @map("total_delivered")
  selfReportedDeliveryRate  Float @default(0) @map("self_reported_delivery_rate")
  verifiedDeliveryRate      Float @default(0) @map("verified_delivery_rate")
  leaderboardRank           Int   @default(0) @map("leaderboard_rank")
  
  // Relationships
  commitments       DonorCommitment[]
  responses         RapidResponse[]
  entityAssignments EntityAssignment[]
  
  // Timestamps
  registrationDate Date     @map("registration_date")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  
  @@index([email])
  @@index([leaderboardRank])
  @@map("donors")
}

model DonorCommitment {
  id         String   @id @default(uuid())
  donorId    String   @map("donor_id")
  entityId   String   @map("entity_id")
  incidentId String   @map("incident_id")
  
  // Commitment details
  commitmentDate       Date  @map("commitment_date")
  items                Json  // Array of {name, unit, quantity, delivered}
  totalValueEstimated  Float? @map("total_value_estimated")
  
  // Delivery tracking
  deliveryStatus            DeliveryStatus @default(PLANNED) @map("delivery_status")
  deliveredQuantity         Int            @default(0) @map("delivered_quantity")
  verifiedDeliveredQuantity Int            @default(0) @map("verified_delivered_quantity")
  
  // Relationships
  donor  Donor          @relation(fields: [donorId], references: [id])
  entity AffectedEntity @relation(fields: [entityId], references: [id])
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@index([donorId])
  @@index([entityId])
  @@index([incidentId])
  @@index([deliveryStatus])
  @@map("donor_commitments")
}

enum DeliveryStatus {
  PLANNED
  PARTIAL
  COMPLETE
}

// ============================================
// MEDIA ATTACHMENTS
// ============================================

model MediaAttachment {
  id           String  @id @default(uuid())
  url          String? // R2/S3 URL after sync
  localPath    String? @map("local_path") // Device path before sync
  thumbnailUrl String? @map("thumbnail_url")
  
  // File metadata
  mimeType String @map("mime_type")
  size     Int
  filename String
  
  // Capture metadata (JSON)
  metadata Json
  
  // Links
  assessmentId String? @map("assessment_id")
  responseId   String? @map("response_id")
  
  // Sync
  syncStatus SyncStatus @default(LOCAL) @map("sync_status")
  
  // Relationships
  assessment RapidAssessment? @relation(fields: [assessmentId], references: [id])
  response   RapidResponse?   @relation(fields: [responseId], references: [id])
  
  // Timestamps
  createdAt  DateTime  @default(now()) @map("created_at")
  uploadedAt DateTime? @map("uploaded_at")
  
  @@index([assessmentId])
  @@index([responseId])
  @@index([syncStatus])
  @@map("media_attachments")
}

// ============================================
// SYNC MANAGEMENT
// ============================================

model SyncConflict {
  id         String   @id @default(uuid())
  entityType String   @map("entity_type") // "ASSESSMENT" or "RESPONSE"
  entityId   String   @map("entity_id")
  
  // Conflict details
  conflictDate Date @map("conflict_date")
  
  // Resolution
  resolutionMethod String   @default("LAST_WRITE_WINS") @map("resolution_method")
  winningVersion   Json     @map("winning_version")
  losingVersion    Json     @map("losing_version")
  resolvedAt       DateTime @map("resolved_at")
  
  // Notification
  coordinatorNotified   Boolean   @default(false) @map("coordinator_notified")
  coordinatorNotifiedAt DateTime? @map("coordinator_notified_at")
  
  // Relationships (polymorphic)
  assessment RapidAssessment? @relation(fields: [entityId], references: [id])
  response   RapidResponse?   @relation(fields: [entityId], references: [id])
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  
  @@index([entityType])
  @@index([entityId])
  @@index([conflictDate])
  @@map("sync_conflicts")
}

// ============================================
// AUDIT TRAIL
// ============================================

model AuditLog {
  id         String @id @default(uuid())
  userId     String @map("user_id")
  action     String
  
  // Entity details
  entityType String @map("entity_type")
  entityId   String @map("entity_id")
  
  // Changes (JSON)
  beforeValue Json? @map("before_value")
  afterValue  Json? @map("after_value")
  
  // Context
  timestamp  DateTime @map("timestamp")
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @db.Text @map("user_agent")
  
  // Relationships
  user User @relation(fields: [userId], references: [id])
  
  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  
  @@index([userId])
  @@index([entityType])
  @@index([timestamp])
  @@map("audit_logs")
}
```

---
