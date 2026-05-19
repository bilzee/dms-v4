# Database Schema Reference

## 1. Overview

The Disaster Response Management System (DMS) uses PostgreSQL as its relational database, managed through Prisma ORM. The schema comprises 27 models and 15 enums organized across six functional domains: User Management, Core Domain, Assessments, Response and Donor Management, Sync and System, and Reports.

The data model supports the full lifecycle of disaster response operations, from user authentication and role-based access control, through incident reporting and multi-type assessments, to response delivery tracking, donor commitment management, and report generation. It is designed for both online and offline-first operation, with explicit sync tracking and conflict resolution built into the assessment and response models.

---

## 2. Database Configuration

| Property       | Value                              |
|----------------|------------------------------------|
| Database       | PostgreSQL                         |
| ORM            | Prisma (prisma-client-js)          |
| Key Strategy   | UUID v4 (`@default(uuid())`)       |
| Connection     | `DATABASE_URL` environment variable|
| Soft Deletes   | `isActive` boolean flags           |
| Flexible Data  | `Json` columns for semi-structured |
| Timestamps     | `createdAt` / `updatedAt` on most  |
|                | models                             |
| Table Mapping  | Explicit `@@map()` snake_case      |

### Key Configuration Details

- **UUID Primary Keys**: Every model uses `@id @default(uuid())` for globally unique, non-sequential identifiers. This supports offline record creation where IDs must be generated client-side without server coordination.
- **JSON Columns**: Models use PostgreSQL `Json` columns for semi-structured data that varies by context (coordinates, metadata, gap analysis, items, resources, timelines, filters, visualizations). This provides schema flexibility without requiring migrations for every data shape change.
- **Explicit Table Mapping**: All models use `@@map("snake_case_table_name")` to map PascalCase Prisma model names to snake_case PostgreSQL table names.
- **Cascade Deletes**: Junction tables and child records (e.g., `UserRole`, `RolePermission`, `EntityAssignment`, sector assessments) use `onDelete: Cascade` to maintain referential integrity when parent records are removed.
- **Composite Unique Constraints**: Junction tables enforce uniqueness on their foreign key pairs (e.g., `@@unique([userId, roleId])`) to prevent duplicate associations.
- **Database Indexes**: The `RapidAssessment` and `DonorCommitment` models include composite indexes to optimize common query patterns such as filtering by entity and date, or by donor and incident.

---

## 3. Enums Reference

| Enum                   | Values                                             | Usage                                                |
|------------------------|----------------------------------------------------|------------------------------------------------------|
| `RoleName`             | `ASSESSOR`, `COORDINATOR`, `RESPONDER`, `DONOR`, `ADMIN` | User role classification in the RBAC system          |
| `EntityType`           | `COMMUNITY`, `WARD`, `LGA`, `STATE`, `FACILITY`, `CAMP` | Geographic or organizational entity classification   |
| `AssessmentType`       | `HEALTH`, `WASH`, `SHELTER`, `FOOD`, `SECURITY`, `POPULATION` | Type of rapid assessment being conducted             |
| `ResponseType`         | `HEALTH`, `WASH`, `SHELTER`, `FOOD`, `SECURITY`, `POPULATION`, `LOGISTICS` | Category of response action (extends AssessmentType with LOGISTICS) |
| `ResponseStatus`       | `PLANNED`, `DELIVERED`                             | Lifecycle stage of a response action                 |
| `Priority`             | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`                | Severity or urgency classification                   |
| `AssessmentStatus`     | `DRAFT`, `SUBMITTED`, `VERIFIED`, `PUBLISHED`      | Workflow state of a rapid assessment                 |
| `VerificationStatus`   | `DRAFT`, `SUBMITTED`, `VERIFIED`, `AUTO_VERIFIED`, `REJECTED` | Verification workflow state for assessments and responses |
| `SyncStatus`           | `PENDING`, `SYNCING`, `SYNCED`, `FAILED`, `CONFLICT`, `LOCAL` | Offline synchronization state of a record            |
| `DonorType`            | `INDIVIDUAL`, `ORGANIZATION`, `GOVERNMENT`, `NGO`, `CORPORATE` | Classification of donor entities                     |
| `IncidentStatus`       | `ACTIVE`, `CONTAINED`, `RESOLVED`                  | Lifecycle state of an incident                       |
| `CommitmentStatus`     | `PLANNED`, `PARTIAL`, `COMPLETE`, `CANCELLED`      | Fulfillment state of a donor commitment              |
| `ReportType`           | `ASSESSMENT`, `RESPONSE`, `ENTITY`, `DONOR`, `CUSTOM` | Category of report template                          |
| `ReportExecutionStatus`| `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`        | Execution state of a report generation job           |
| `ReportFormat`         | `PDF`, `CSV`, `HTML`, `EXCEL`                      | Output format for generated reports                  |

---

## 4. Entity Relationship Overview

### User Management

Users are associated with Roles through the `UserRole` junction table, implementing a many-to-many relationship. Roles are associated with Permissions through the `RolePermission` junction table. A User can hold multiple roles simultaneously. Users are also assigned to Entities through the `EntityAssignment` junction table, determining which geographic or organizational areas they can access.

### Core Domain

Entities represent geographic or organizational units (communities, wards, LGAs, states, facilities, camps). Incidents represent disaster events. An Incident can have many PreliminaryAssessments and RapidAssessments. Entities are linked to PreliminaryAssessments through the `PreliminaryAssessmentEntity` junction table, since one assessment may cover multiple affected areas.

### Assessments

A RapidAssessment always belongs to one Entity, one Incident, and one User (the assessor). Each RapidAssessment has exactly one sector-specific detail record (HealthAssessment, PopulationAssessment, FoodAssessment, WASHAssessment, ShelterAssessment, or SecurityAssessment) determined by its `rapidAssessmentType`. These sector tables use the RapidAssessment ID as both their primary key and foreign key, enforcing a one-to-one relationship.

### Response and Donor

A RapidResponse is linked to a RapidAssessment, an Entity, and a User (the responder). It may optionally reference a Donor and a DonorCommitment. A DonorCommitment links a Donor to a specific Entity and Incident. DonorCommitments can spawn multiple RapidResponse records as commitments are fulfilled. MediaAttachment records belong to a single RapidResponse.

### Reports

ReportTemplate is created by a User and can have many ReportConfigurations. Each ReportConfiguration belongs to one template and can have many ReportExecutions. This three-level hierarchy separates template design from configuration and execution.

### Sync and System

SyncConflict records are associated with a RapidResponse and track data conflicts arising from offline edits. AuditLog records are optionally associated with a User and capture all significant system actions. GapFieldSeverity records define severity thresholds for assessment fields and track which User created or last updated them.

---

## 5. Model Details

### 5.1 User Management

#### User

**Table**: `users`

The central identity model for all system users.

| Column         | Type       | Constraints               | Description                          |
|----------------|------------|---------------------------|--------------------------------------|
| `id`           | UUID       | PK, auto-generated        | Unique user identifier               |
| `email`        | String     | Unique, required          | User email address                   |
| `username`     | String     | Unique, required          | Login username                       |
| `passwordHash` | String     | Required                  | Bcrypt-hashed password               |
| `name`         | String     | Required                  | Display name                         |
| `phone`        | String     | Optional                  | Contact phone number                 |
| `organization` | String     | Optional                  | Affiliated organization              |
| `isActive`     | Boolean    | Default: `true`           | Soft delete flag                     |
| `isLocked`     | Boolean    | Default: `false`          | Account lock status                  |
| `lastLogin`    | DateTime   | Optional                  | Timestamp of last login              |
| `createdAt`    | DateTime   | Default: `now()`          | Record creation timestamp            |
| `updatedAt`    | DateTime   | Auto-updated              | Record modification timestamp        |

**Relationships**:
- `roles` -> `UserRole[]` (one-to-many)
- `auditLogs` -> `AuditLog[]` (one-to-many)
- `entityAssignments` -> `EntityAssignment[]` (one-to-many)
- `assessments` -> `RapidAssessment[]` (one-to-many, named "AssessorResponses")
- `responses` -> `RapidResponse[]` (one-to-many, named "UserResponses")
- `reportTemplates` -> `ReportTemplate[]` (one-to-many, named "ReportTemplates")
- `reportConfigurations` -> `ReportConfiguration[]` (one-to-many, named "ReportConfigurations")
- `gapFieldSeveritiesCreated` -> `GapFieldSeverity[]` (one-to-many, named "GapFieldSeverityCreatedBy")
- `gapFieldSeveritiesUpdated` -> `GapFieldSeverity[]` (one-to-many, named "GapFieldSeverityUpdatedBy")

---

#### Role

**Table**: `roles`

Defines named roles for the RBAC system.

| Column       | Type     | Constraints               | Description                       |
|--------------|----------|---------------------------|-----------------------------------|
| `id`         | UUID     | PK, auto-generated        | Unique role identifier            |
| `name`       | RoleName | Unique, required          | Role name from RoleName enum      |
| `description`| String   | Required                  | Human-readable role description   |
| `createdAt`  | DateTime | Default: `now()`          | Record creation timestamp         |

**Relationships**:
- `permissions` -> `RolePermission[]` (one-to-many)
- `userRoles` -> `UserRole[]` (one-to-many)

---

#### UserRole

**Table**: `user_roles`

Junction table linking Users to Roles. Supports many-to-many user-role assignments.

| Column       | Type     | Constraints                        | Description                    |
|--------------|----------|------------------------------------|--------------------------------|
| `id`         | UUID     | PK, auto-generated                 | Unique assignment identifier   |
| `userId`     | UUID     | FK -> `users.id`, Cascade delete   | Assigned user                  |
| `roleId`     | UUID     | FK -> `roles.id`, Cascade delete   | Assigned role                  |
| `assignedAt` | DateTime | Default: `now()`                   | Timestamp of assignment        |
| `assignedBy` | String   | Required                           | ID of the user who made the assignment |

**Constraints**: `@@unique([userId, roleId])` prevents duplicate role assignments.

---

#### Permission

**Table**: `permissions`

Defines granular permissions that can be assigned to roles.

| Column       | Type     | Constraints               | Description                       |
|--------------|----------|---------------------------|-----------------------------------|
| `id`         | UUID     | PK, auto-generated        | Unique permission identifier      |
| `name`       | String   | Required                  | Human-readable permission name    |
| `code`       | String   | Unique, required          | Machine-readable permission code  |
| `category`   | String   | Required                  | Permission grouping category      |
| `description`| String   | Required                  | What this permission allows       |
| `createdAt`  | DateTime | Default: `now()`          | Record creation timestamp         |

**Relationships**:
- `roles` -> `RolePermission[]` (one-to-many)

---

#### RolePermission

**Table**: `role_permissions`

Junction table linking Roles to Permissions. Supports many-to-many role-permission assignments.

| Column        | Type | Constraints                          | Description             |
|---------------|------|--------------------------------------|-------------------------|
| `id`          | UUID | PK, auto-generated                   | Unique entry identifier |
| `roleId`      | UUID | FK -> `roles.id`, Cascade delete     | Associated role         |
| `permissionId`| UUID | FK -> `permissions.id`, Cascade delete | Associated permission |

**Constraints**: `@@unique([roleId, permissionId])` prevents duplicate permission assignments.

---

### 5.2 Core Domain

#### Entity

**Table**: `entities`

Represents geographic or organizational units that can be assessed and receive responses. Entities form the spatial backbone of the system.

| Column                | Type       | Constraints               | Description                                      |
|-----------------------|------------|---------------------------|--------------------------------------------------|
| `id`                  | UUID       | PK, auto-generated        | Unique entity identifier                          |
| `name`                | String     | Required                  | Entity display name                               |
| `type`                | EntityType | Required                  | Classification (COMMUNITY, WARD, LGA, etc.)      |
| `location`            | String     | Optional                  | Textual location description                      |
| `coordinates`         | Json       | Optional                  | Geo coordinates (lat/lng object)                  |
| `metadata`            | Json       | Optional                  | Extensible entity attributes                      |
| `isActive`            | Boolean    | Default: `true`           | Soft delete flag                                  |
| `autoApproveEnabled`  | Boolean    | Default: `false`          | Whether assessments auto-approve for this entity  |
| `createdAt`           | DateTime   | Default: `now()`          | Record creation timestamp                         |
| `updatedAt`           | DateTime   | Auto-updated              | Record modification timestamp                     |

**Constraints**: `@@unique([name, type])` ensures no duplicate entity names within the same type.

**Relationships**:
- `commitments` -> `DonorCommitment[]` (one-to-many)
- `assignments` -> `EntityAssignment[]` (one-to-many)
- `rapidAssessments` -> `RapidAssessment[]` (one-to-many)
- `responses` -> `RapidResponse[]` (one-to-many, named "EntityResponses")
- `preliminaryAssessments` -> `PreliminaryAssessmentEntity[]` (one-to-many)

---

#### Incident

**Table**: `incidents`

Represents disaster events that trigger assessments and response activities.

| Column        | Type           | Constraints               | Description                                  |
|---------------|----------------|---------------------------|----------------------------------------------|
| `id`          | UUID           | PK, auto-generated        | Unique incident identifier                    |
| `name`        | String         | Required                  | Incident name or title                        |
| `type`        | String         | Required                  | Incident type (e.g., flood, fire, conflict)   |
| `subType`     | String         | Optional                  | Further classification of the incident        |
| `severity`    | Priority       | Default: `MEDIUM`         | Incident severity level                       |
| `status`      | IncidentStatus | Default: `ACTIVE`         | Current lifecycle state                       |
| `description` | String         | Required                  | Detailed incident description                 |
| `location`    | String         | Required                  | Textual location description                  |
| `coordinates` | Json           | Optional                  | Geo coordinates (lat/lng object)              |
| `createdBy`   | String         | Required                  | ID of the user who created the incident       |
| `createdAt`   | DateTime       | Default: `now()`          | Record creation timestamp                     |
| `updatedAt`   | DateTime       | Auto-updated              | Record modification timestamp                 |

**Relationships**:
- `commitments` -> `DonorCommitment[]` (one-to-many)
- `preliminaryAssessments` -> `PreliminaryAssessment[]` (one-to-many)
- `rapidAssessments` -> `RapidAssessment[]` (one-to-many)

---

#### EntityAssignment

**Table**: `entity_assignments`

Junction table linking Users to Entities. Determines which geographic areas a user is authorized to work in.

| Column       | Type     | Constraints                        | Description                      |
|--------------|----------|------------------------------------|----------------------------------|
| `id`         | UUID     | PK, auto-generated                 | Unique assignment identifier     |
| `userId`     | UUID     | FK -> `users.id`, Cascade delete   | Assigned user                    |
| `entityId`   | UUID     | FK -> `entities.id`, Cascade delete | Assigned entity                 |
| `assignedAt` | DateTime | Default: `now()`                   | Timestamp of assignment          |
| `assignedBy` | String   | Required                           | ID of the user who made the assignment |

**Constraints**: `@@unique([userId, entityId])` prevents duplicate entity assignments.

---

### 5.3 Assessments

#### PreliminaryAssessment

**Table**: `preliminary_assessments`

Captures initial damage and impact reports for an incident. Records the geographic location of the report and key impact metrics such as lives lost, injuries, displacement, and infrastructure damage.

| Column                                | Type     | Constraints              | Description                                  |
|---------------------------------------|----------|--------------------------|----------------------------------------------|
| `id`                                  | UUID     | PK, auto-generated       | Unique assessment identifier                  |
| `reportingDate`                       | DateTime | Required                 | Date of the report                            |
| `reportingLatitude`                   | Float    | Required                 | GPS latitude of report location               |
| `reportingLongitude`                  | Float    | Required                 | GPS longitude of report location              |
| `reportingLGA`                        | String   | Required                 | Local Government Area name                    |
| `reportingWard`                       | String   | Required                 | Ward name                                     |
| `numberLivesLost`                     | Int      | Default: `0`             | Count of lives lost                           |
| `numberInjured`                       | Int      | Default: `0`             | Count of injured persons                      |
| `numberDisplaced`                     | Int      | Default: `0`             | Count of displaced persons                    |
| `numberHousesAffected`                | Int      | Default: `0`             | Count of houses affected                      |
| `numberSchoolsAffected`               | Int      | Default: `0`             | Count of schools affected                     |
| `schoolsAffected`                     | String   | Optional                 | Names/details of affected schools             |
| `numberMedicalFacilitiesAffected`     | Int      | Default: `0`             | Count of medical facilities affected          |
| `medicalFacilitiesAffected`           | String   | Optional                 | Names/details of affected facilities          |
| `estimatedAgriculturalLandsAffected`  | String   | Optional                 | Description of agricultural land impact       |
| `reportingAgent`                      | String   | Required                 | Name of the reporting agent                   |
| `additionalDetails`                   | Json     | Optional                 | Extensible additional information              |
| `incidentId`                          | UUID     | Optional, FK             | Associated incident (nullable for standalone) |
| `createdAt`                           | DateTime | Default: `now()`         | Record creation timestamp                     |
| `updatedAt`                           | DateTime | Auto-updated             | Record modification timestamp                 |

**Relationships**:
- `incident` -> `Incident?` (many-to-one, optional)
- `affectedEntities` -> `PreliminaryAssessmentEntity[]` (one-to-many)

---

#### PreliminaryAssessmentEntity

**Table**: `preliminary_assessment_entities`

Junction table linking PreliminaryAssessments to Entities. One assessment can affect multiple entities.

| Column                  | Type | Constraints                                  | Description              |
|-------------------------|------|----------------------------------------------|--------------------------|
| `id`                    | UUID | PK, auto-generated                           | Unique entry identifier  |
| `preliminaryAssessmentId`| UUID | FK -> `preliminary_assessments.id`, Cascade  | Parent assessment        |
| `entityId`              | UUID | FK -> `entities.id`, Cascade                 | Affected entity          |
| `createdAt`             | DateTime | Default: `now()`                         | Record creation timestamp|

**Constraints**: `@@unique([preliminaryAssessmentId, entityId])` prevents duplicate entity links.

---

#### RapidAssessment

**Table**: `rapid_assessments`

The primary assessment model that supports six sector types. Each RapidAssessment is associated with one Entity, one Incident, and one User (assessor). It tracks the full workflow from draft through verification and supports offline creation with sync status tracking.

| Column                | Type               | Constraints               | Description                                     |
|-----------------------|--------------------|---------------------------|-------------------------------------------------|
| `id`                  | UUID               | PK, auto-generated        | Unique assessment identifier                     |
| `rapidAssessmentType` | AssessmentType     | Required                  | Sector type (HEALTH, WASH, etc.)                 |
| `rapidAssessmentDate` | DateTime           | Required                  | Date assessment was conducted                    |
| `assessorId`          | UUID               | FK -> `users.id`          | User who conducted the assessment                |
| `entityId`            | UUID               | FK -> `entities.id`       | Entity being assessed                            |
| `assessorName`        | String             | Required                  | Denormalized assessor name                       |
| `location`            | String             | Optional                  | Textual location description                     |
| `coordinates`         | Json               | Optional                  | Geo coordinates (lat/lng object)                 |
| `status`              | AssessmentStatus   | Default: `DRAFT`          | Workflow status                                  |
| `priority`            | Priority           | Default: `MEDIUM`         | Assessed priority level                          |
| `versionNumber`       | Int                | Default: `1`              | Version for optimistic concurrency               |
| `isOfflineCreated`    | Boolean            | Default: `false`          | Whether created while offline                    |
| `syncStatus`          | SyncStatus         | Default: `PENDING`        | Synchronization state                            |
| `verificationStatus`  | VerificationStatus | Default: `DRAFT`          | Verification workflow state                      |
| `verifiedAt`          | DateTime           | Optional                  | When verification occurred                       |
| `verifiedBy`          | String             | Optional                  | ID of user who verified                          |
| `rejectionReason`     | String             | Optional                  | Reason for rejection                             |
| `rejectionFeedback`   | String             | Optional                  | Detailed rejection feedback                      |
| `mediaAttachments`    | Json               | Optional                  | Array of attached media references               |
| `gapAnalysis`         | Json               | Optional                  | Computed gap analysis results                    |
| `incidentId`          | UUID               | FK -> `incidents.id`      | Associated incident                              |
| `createdAt`           | DateTime           | Default: `now()`          | Record creation timestamp                        |
| `updatedAt`           | DateTime           | Auto-updated              | Record modification timestamp                    |

**Indexes**:
- `@@index([rapidAssessmentType, rapidAssessmentDate, entityId])` -- composite query optimization
- `@@index([entityId, rapidAssessmentDate])` -- entity timeline queries
- `@@index([incidentId, rapidAssessmentDate])` -- incident timeline queries
- `@@index([incidentId, entityId])` -- incident-entity cross-reference
- `@@index([assessorId, createdAt])` -- assessor activity queries
- `@@index([status, priority])` -- status-priority filtering
- `@@index([createdAt, rapidAssessmentType])` -- chronological type queries
- `@@index([rapidAssessmentDate, rapidAssessmentType])` -- date-range type queries
- `@@index([syncStatus, isOfflineCreated])` -- offline sync queue

**Relationships**:
- `assessor` -> `User` (many-to-one, named "AssessorResponses")
- `entity` -> `Entity` (many-to-one)
- `incident` -> `Incident` (many-to-one)
- `foodAssessment` -> `FoodAssessment?` (one-to-one)
- `healthAssessment` -> `HealthAssessment?` (one-to-one)
- `populationAssessment` -> `PopulationAssessment?` (one-to-one)
- `securityAssessment` -> `SecurityAssessment?` (one-to-one)
- `shelterAssessment` -> `ShelterAssessment?` (one-to-one)
- `washAssessment` -> `WASHAssessment?` (one-to-one)
- `responses` -> `RapidResponse[]` (one-to-many, named "AssessmentResponses")

---

#### Sector Assessments

Each sector assessment uses a **shared-key one-to-one** pattern where the `rapidAssessmentId` serves as both the primary key and the foreign key to `RapidAssessment`.

##### HealthAssessment

**Table**: `health_assessments`

| Column                    | Type    | Constraints                              | Description                            |
|---------------------------|---------|------------------------------------------|----------------------------------------|
| `rapidAssessmentId`       | UUID    | PK, FK -> `rapid_assessments.id`, Cascade | Parent assessment (shared key)         |
| `hasFunctionalClinic`     | Boolean | Required                                 | Whether a functional clinic exists     |
| `hasEmergencyServices`    | Boolean | Required                                 | Emergency services availability        |
| `numberHealthFacilities`  | Int     | Required                                 | Count of health facilities             |
| `healthFacilityType`      | String  | Required                                 | Type of health facility                |
| `qualifiedHealthWorkers`  | Int     | Required                                 | Number of qualified health workers     |
| `hasTrainedStaff`         | Boolean | Required                                 | Whether trained staff are available    |
| `hasMedicineSupply`       | Boolean | Required                                 | Medicine supply availability           |
| `hasMedicalSupplies`      | Boolean | Required                                 | General medical supplies availability  |
| `hasMaternalChildServices`| Boolean | Required                                 | Maternal and child health services     |
| `commonHealthIssues`      | String  | Default: `"[]"`                          | JSON array of common health issues     |
| `additionalHealthDetails` | Json    | Optional                                 | Extensible additional information      |

##### PopulationAssessment

**Table**: `population_assessments`

| Column                       | Type    | Constraints                              | Description                            |
|------------------------------|---------|------------------------------------------|----------------------------------------|
| `rapidAssessmentId`          | UUID    | PK, FK -> `rapid_assessments.id`, Cascade | Parent assessment (shared key)         |
| `totalHouseholds`            | Int     | Required                                 | Total households counted               |
| `totalPopulation`            | Int     | Required                                 | Total population counted               |
| `populationMale`             | Int     | Required                                 | Male population count                  |
| `populationFemale`           | Int     | Required                                 | Female population count                |
| `populationUnder5`           | Int     | Required                                 | Children under 5 count                 |
| `pregnantWomen`              | Int     | Required                                 | Pregnant women count                   |
| `lactatingMothers`           | Int     | Required                                 | Lactating mothers count                |
| `personWithDisability`       | Int     | Required                                 | Persons with disability count          |
| `elderlyPersons`             | Int     | Required                                 | Elderly persons count                  |
| `separatedChildren`          | Int     | Required                                 | Separated or unaccompanied children    |
| `numberLivesLost`            | Int     | Required                                 | Lives lost in the assessed area        |
| `numberInjured`              | Int     | Required                                 | Injured persons count                  |
| `additionalPopulationDetails`| String  | Optional                                 | Additional population information      |

##### FoodAssessment

**Table**: `food_assessments`

| Column                             | Type    | Constraints                              | Description                            |
|------------------------------------|---------|------------------------------------------|----------------------------------------|
| `rapidAssessmentId`                | UUID    | PK, FK -> `rapid_assessments.id`, Cascade | Parent assessment (shared key)         |
| `isFoodSufficient`                 | Boolean | Required                                 | Whether current food supply is adequate |
| `hasRegularMealAccess`             | Boolean | Required                                 | Regular meal access availability       |
| `hasInfantNutrition`               | Boolean | Required                                 | Infant nutrition support availability  |
| `foodSource`                       | String  | Default: `"[]"`                          | JSON array of food sources             |
| `availableFoodDurationDays`        | Int     | Required                                 | Days of food remaining                 |
| `additionalFoodRequiredPersons`    | Int     | Required                                 | Persons needing additional food        |
| `additionalFoodRequiredHouseholds` | Int     | Required                                 | Households needing additional food     |
| `additionalFoodDetails`            | Json    | Optional                                 | Extensible additional information      |

##### WASHAssessment

**Table**: `wash_assessments`

| Column                        | Type    | Constraints                              | Description                            |
|-------------------------------|---------|------------------------------------------|----------------------------------------|
| `rapidAssessmentId`           | UUID    | PK, FK -> `rapid_assessments.id`, Cascade | Parent assessment (shared key)         |
| `waterSource`                 | String  | Default: `"[]"`                          | JSON array of water sources            |
| `isWaterSufficient`           | Boolean | Required                                 | Whether water supply is adequate       |
| `hasCleanWaterAccess`         | Boolean | Required                                 | Clean water access availability        |
| `functionalLatrinesAvailable` | Int     | Required                                 | Count of functional latrines           |
| `areLatrinesSufficient`       | Boolean | Required                                 | Whether latrine count is adequate      |
| `hasHandwashingFacilities`    | Boolean | Required                                 | Handwashing facility availability      |
| `hasOpenDefecationConcerns`   | Boolean | Required                                 | Open defecation risk flag              |
| `additionalWashDetails`       | Json    | Optional                                 | Extensible additional information      |

##### ShelterAssessment

**Table**: `shelter_assessments`

| Column                     | Type    | Constraints                              | Description                            |
|----------------------------|---------|------------------------------------------|----------------------------------------|
| `rapidAssessmentId`        | UUID    | PK, FK -> `rapid_assessments.id`, Cascade | Parent assessment (shared key)         |
| `areSheltersSufficient`    | Boolean | Required                                 | Whether shelter count is adequate      |
| `hasSafeStructures`        | Boolean | Required                                 | Structural safety of shelters          |
| `shelterTypes`             | String  | Default: `"[]"`                          | JSON array of existing shelter types   |
| `requiredShelterType`      | String  | Default: `"[]"`                          | JSON array of needed shelter types     |
| `numberSheltersRequired`   | Int     | Required                                 | Number of additional shelters needed   |
| `areOvercrowded`           | Boolean | Required                                 | Overcrowding flag                      |
| `provideWeatherProtection` | Boolean | Required                                 | Weather protection adequacy            |
| `additionalShelterDetails` | Json    | Optional                                 | Extensible additional information      |

##### SecurityAssessment

**Table**: `security_assessments`

| Column                            | Type    | Constraints                              | Description                            |
|-----------------------------------|---------|------------------------------------------|----------------------------------------|
| `rapidAssessmentId`               | UUID    | PK, FK -> `rapid_assessments.id`, Cascade | Parent assessment (shared key)         |
| `isSafeFromViolence`              | Boolean | Required                                 | Safety from violence assessment        |
| `gbvCasesReported`                | Boolean | Required                                 | Gender-based violence cases reported   |
| `hasSecurityPresence`             | Boolean | Required                                 | Security personnel presence            |
| `hasProtectionReportingMechanism` | Boolean | Required                                 | Protection reporting mechanism exists  |
| `vulnerableGroupsHaveAccess`      | Boolean | Required                                 | Access for vulnerable groups           |
| `hasLighting`                     | Boolean | Required                                 | Adequate lighting availability         |
| `additionalSecurityDetails`       | Json    | Optional                                 | Extensible additional information      |

---

### 5.4 Response and Donor

#### RapidResponse

**Table**: `rapid_responses`

Records response actions taken to address assessed needs. A response is linked to a specific assessment, entity, and responder. It optionally connects to a donor and commitment when the response fulfills a donor pledge.

| Column               | Type               | Constraints                            | Description                                |
|----------------------|--------------------|----------------------------------------|--------------------------------------------|
| `id`                 | UUID               | PK, auto-generated                     | Unique response identifier                  |
| `responderId`        | UUID               | FK -> `users.id`                       | User responsible for the response           |
| `entityId`           | UUID               | FK -> `entities.id`                    | Entity receiving the response               |
| `assessmentId`       | UUID               | FK -> `rapid_assessments.id`           | Assessment that triggered the response      |
| `type`               | ResponseType       | Required                               | Response category                           |
| `priority`           | Priority           | Default: `MEDIUM`                      | Response priority                           |
| `status`             | ResponseStatus     | Default: `PLANNED`                     | Response lifecycle state                    |
| `description`        | String             | Optional                               | Response description                        |
| `resources`          | Json               | Optional                               | Allocated resources                         |
| `timeline`           | Json               | Optional                               | Planned or actual timeline                  |
| `versionNumber`      | Int                | Default: `1`                           | Version for optimistic concurrency          |
| `isOfflineCreated`   | Boolean            | Default: `false`                       | Whether created while offline               |
| `verificationStatus` | VerificationStatus | Default: `DRAFT`                       | Verification workflow state                 |
| `verifiedAt`         | DateTime           | Optional                               | When verification occurred                  |
| `verifiedBy`         | String             | Optional                               | ID of user who verified                     |
| `donorId`            | UUID               | Optional, FK -> `donors.id`            | Associated donor (optional)                 |
| `commitmentId`       | UUID               | Optional, FK -> `donor_commitments.id` | Associated commitment (optional)            |
| `items`              | Json               | Required                               | Response items or deliverables              |
| `offlineId`          | String             | Unique, optional                       | Client-generated ID for offline sync        |
| `plannedDate`        | DateTime           | Default: `now()`                       | Planned execution date                      |
| `rejectionFeedback`  | String             | Optional                               | Feedback on rejected response               |
| `rejectionReason`    | String             | Optional                               | Reason for rejection                        |
| `responseDate`       | DateTime           | Optional                               | Actual response execution date              |
| `syncStatus`         | SyncStatus         | Default: `LOCAL`                       | Synchronization state                       |
| `createdAt`          | DateTime           | Default: `now()`                       | Record creation timestamp                   |
| `updatedAt`          | DateTime           | Auto-updated                           | Record modification timestamp               |

**Indexes**:
- `@@index([commitmentId])` -- commitment lookup optimization

**Relationships**:
- `assessment` -> `RapidAssessment` (many-to-one, named "AssessmentResponses")
- `commitment` -> `DonorCommitment?` (many-to-one, named "CommitmentResponses")
- `donor` -> `Donor?` (many-to-one, named "DonorResponses")
- `entity` -> `Entity` (many-to-one, named "EntityResponses")
- `responder` -> `User` (many-to-one, named "UserResponses")
- `conflicts` -> `SyncConflict[]` (one-to-many, named "ResponseConflicts")
- `mediaAttachments` -> `MediaAttachment[]` (one-to-many)

---

#### Donor

**Table**: `donors`

Records donor entities that can make commitments to support response efforts.

| Column                    | Type     | Constraints               | Description                              |
|---------------------------|----------|---------------------------|------------------------------------------|
| `id`                      | UUID     | PK, auto-generated        | Unique donor identifier                   |
| `name`                    | String   | Required                  | Donor display name                        |
| `type`                    | DonorType| Default: `ORGANIZATION`   | Donor classification                      |
| `contactEmail`            | String   | Optional                  | Contact email address                     |
| `contactPhone`            | String   | Optional                  | Contact phone number                      |
| `organization`            | String   | Optional                  | Organization name                         |
| `isActive`                | Boolean  | Default: `true`           | Soft delete flag                          |
| `leaderboardRank`         | Int      | Default: `0`              | Gamification leaderboard position         |
| `selfReportedDeliveryRate`| Float    | Default: `0`              | Delivery rate self-reported by donor      |
| `verifiedDeliveryRate`    | Float    | Default: `0`              | System-verified delivery rate             |
| `createdAt`               | DateTime | Default: `now()`          | Record creation timestamp                 |
| `updatedAt`               | DateTime | Auto-updated              | Record modification timestamp             |

**Relationships**:
- `commitments` -> `DonorCommitment[]` (one-to-many)
- `responses` -> `RapidResponse[]` (one-to-many, named "DonorResponses")

---

#### DonorCommitment

**Table**: `donor_commitments`

Tracks pledges made by donors to provide resources for specific entities and incidents.

| Column                       | Type             | Constraints               | Description                                 |
|------------------------------|------------------|---------------------------|---------------------------------------------|
| `id`                         | UUID             | PK, auto-generated        | Unique commitment identifier                 |
| `donorId`                    | UUID             | FK -> `donors.id`         | Donor making the commitment                 |
| `entityId`                   | UUID             | FK -> `entities.id`       | Entity receiving the commitment             |
| `incidentId`                 | UUID             | FK -> `incidents.id`      | Incident the commitment addresses           |
| `status`                     | CommitmentStatus | Default: `PLANNED`        | Fulfillment status                          |
| `items`                      | Json             | Required                  | Pledged items and quantities                |
| `totalCommittedQuantity`     | Int              | Default: `0`              | Total quantity committed                    |
| `deliveredQuantity`          | Int              | Default: `0`              | Quantity delivered so far                   |
| `verifiedDeliveredQuantity`  | Int              | Default: `0`              | Verified delivered quantity                 |
| `commitmentDate`             | DateTime         | Default: `now()`          | Date commitment was made                    |
| `lastUpdated`                | DateTime         | Auto-updated              | Last modification timestamp                 |
| `notes`                      | String           | Optional                  | Additional notes                            |
| `totalValueEstimated`        | Float            | Default: `0`              | Estimated total value of commitment         |

**Indexes**:
- `@@index([donorId, entityId])` -- donor-entity lookup
- `@@index([donorId, incidentId])` -- donor-incident lookup
- `@@index([status])` -- status filtering
- `@@index([entityId, incidentId])` -- entity-incident cross-reference

**Relationships**:
- `donor` -> `Donor` (many-to-one)
- `entity` -> `Entity` (many-to-one)
- `incident` -> `Incident` (many-to-one)
- `responses` -> `RapidResponse[]` (one-to-many, named "CommitmentResponses")

---

#### MediaAttachment

**Table**: `media_attachments`

Stores metadata for files attached to responses (photos, documents, etc.).

| Column          | Type     | Constraints                            | Description                      |
|-----------------|----------|----------------------------------------|----------------------------------|
| `id`            | UUID     | PK, auto-generated                     | Unique attachment identifier     |
| `responseId`    | UUID     | FK -> `rapid_responses.id`, Cascade    | Parent response                  |
| `filename`      | String   | Required                               | Server-side filename             |
| `originalName`  | String   | Required                               | Original upload filename         |
| `mimeType`      | String   | Required                               | MIME type (e.g., image/jpeg)     |
| `fileSize`      | Int      | Required                               | File size in bytes               |
| `filePath`      | String   | Required                               | Storage path on disk or bucket   |
| `thumbnailPath` | String   | Optional                               | Thumbnail storage path           |
| `uploadedAt`    | DateTime | Default: `now()`                       | Upload timestamp                 |
| `uploadedBy`    | String   | Required                               | ID of the uploading user         |

---

### 5.5 Sync and System

#### SyncConflict

**Table**: `sync_conflicts`

Records data conflicts that arise when offline changes are synchronized with the server. Each conflict captures both the winning and losing versions of the data.

| Column                   | Type     | Constraints                       | Description                              |
|--------------------------|----------|-----------------------------------|------------------------------------------|
| `id`                     | UUID     | PK, auto-generated                | Unique conflict identifier                |
| `entityType`             | String   | Required                          | Type of entity that conflicted            |
| `entityId`               | String   | Required                          | ID of the conflicting record              |
| `conflictDate`           | DateTime | Default: `now()`                  | When the conflict was detected            |
| `resolutionMethod`       | String   | Default: `"LAST_WRITE_WINS"`      | Strategy used to resolve the conflict     |
| `winningVersion`         | Json     | Required                          | The data version that was kept            |
| `losingVersion`          | Json     | Required                          | The data version that was discarded       |
| `resolvedAt`             | DateTime | Default: `now()`                  | When the conflict was resolved            |
| `coordinatorNotified`    | Boolean  | Default: `false`                  | Whether coordinator was notified          |
| `coordinatorNotifiedAt`  | DateTime | Optional                          | When coordinator was notified             |
| `responseId`             | UUID     | Optional, FK -> `rapid_responses.id` | Associated response (optional)        |

**Relationships**:
- `response` -> `RapidResponse?` (many-to-one, named "ResponseConflicts")

---

#### AuditLog

**Table**: `audit_logs`

Records all significant system actions for compliance and debugging purposes.

| Column       | Type     | Constraints               | Description                              |
|--------------|----------|---------------------------|------------------------------------------|
| `id`         | UUID     | PK, auto-generated        | Unique log entry identifier               |
| `userId`     | UUID     | Optional, FK -> `users.id`| User who performed the action (nullable for system actions) |
| `action`     | String   | Required                  | Action performed (e.g., CREATE, UPDATE)  |
| `resource`   | String   | Required                  | Resource type affected                   |
| `resourceId` | String   | Optional                  | ID of the affected resource              |
| `oldValues`  | Json     | Optional                  | Previous state snapshot                  |
| `newValues`  | Json     | Optional                  | New state snapshot                       |
| `timestamp`  | DateTime | Default: `now()`          | When the action occurred                 |
| `ipAddress`  | String   | Optional                  | Client IP address                        |
| `userAgent`  | String   | Optional                  | Client user agent string                 |

**Relationships**:
- `user` -> `User?` (many-to-one)

---

#### GapFieldSeverity

**Table**: `gap_field_severities`

Defines severity thresholds for individual assessment fields. Used by the gap analysis engine to calculate which fields represent critical gaps based on assessment type.

| Column           | Type           | Constraints                                  | Description                          |
|------------------|----------------|----------------------------------------------|--------------------------------------|
| `id`             | UUID           | PK, auto-generated                           | Unique entry identifier              |
| `fieldName`      | String         | Required, mapped to `field_name`             | Programmatic field name              |
| `assessmentType` | AssessmentType | Required, mapped to `assessment_type`        | Which assessment type this applies to|
| `severity`       | Priority       | Default: `MEDIUM`                            | Severity level for this field        |
| `displayName`    | String         | Required, mapped to `display_name`           | Human-readable field name            |
| `description`    | String         | Optional                                     | Description of the severity rule     |
| `isActive`       | Boolean        | Default: `true`, mapped to `is_active`       | Whether this rule is active          |
| `createdAt`      | DateTime       | Default: `now()`, mapped to `created_at`     | Record creation timestamp            |
| `updatedAt`      | DateTime       | Auto-updated, mapped to `updated_at`         | Record modification timestamp        |
| `createdBy`      | String         | Optional, mapped to `created_by`, FK -> `users.id` | User who created the rule     |
| `updatedBy`      | String         | Optional, mapped to `updated_by`, FK -> `users.id` | User who last updated the rule |

**Constraints**: `@@unique([fieldName, assessmentType])` ensures one severity rule per field per assessment type.

**Indexes**:
- `@@index([assessmentType])` -- assessment type filtering
- `@@index([severity])` -- severity filtering
- `@@index([isActive])` -- active rule filtering

**Column Mapping**: This model uses `@map()` for individual column names to maintain snake_case in the database while using camelCase in the Prisma client.

**Relationships**:
- `createdByUser` -> `User?` (many-to-one, named "GapFieldSeverityCreatedBy")
- `updatedByUser` -> `User?` (many-to-one, named "GapFieldSeverityUpdatedBy")

---

### 5.6 Reports

#### ReportTemplate

**Table**: `report_templates`

Defines reusable report templates with layout configuration.

| Column        | Type       | Constraints               | Description                              |
|---------------|------------|---------------------------|------------------------------------------|
| `id`          | UUID       | PK, auto-generated        | Unique template identifier                |
| `name`        | String     | Required                  | Template name                             |
| `description` | String     | Optional                  | Template description                      |
| `type`        | ReportType | Default: `CUSTOM`         | Report category                           |
| `layout`      | Json       | Required                  | Layout and structure configuration        |
| `createdById` | UUID       | FK -> `users.id`          | User who created the template             |
| `isPublic`    | Boolean    | Default: `false`          | Whether visible to all users              |
| `createdAt`   | DateTime   | Default: `now()`          | Record creation timestamp                 |
| `updatedAt`   | DateTime   | Auto-updated              | Record modification timestamp             |

**Relationships**:
- `createdBy` -> `User` (many-to-one, named "ReportTemplates")
- `configurations` -> `ReportConfiguration[]` (one-to-many)

---

#### ReportConfiguration

**Table**: `report_configurations`

Stores configured instances of report templates with specific filters, aggregations, and visualization settings.

| Column          | Type            | Constraints                           | Description                          |
|-----------------|-----------------|---------------------------------------|--------------------------------------|
| `id`            | UUID            | PK, auto-generated                    | Unique configuration identifier      |
| `templateId`    | UUID            | FK -> `report_templates.id`, Cascade  | Parent template                      |
| `name`          | String          | Required                              | Configuration name                   |
| `filters`       | Json            | Required                              | Filter criteria                      |
| `aggregations`  | Json            | Required                              | Aggregation rules                    |
| `visualizations`| Json            | Required                              | Visualization configuration          |
| `schedule`      | Json            | Optional                              | Recurring schedule definition        |
| `createdBy`     | UUID            | FK -> `users.id`                      | User who created the configuration   |
| `createdAt`     | DateTime        | Default: `now()`                      | Record creation timestamp            |

**Relationships**:
- `template` -> `ReportTemplate` (many-to-one, Cascade delete)
- `creator` -> `User` (many-to-one, named "ReportConfigurations")
- `executions` -> `ReportExecution[]` (one-to-many)

---

#### ReportExecution

**Table**: `report_executions`

Tracks individual report generation runs, including status and output location.

| Column            | Type                  | Constraints                              | Description                          |
|-------------------|-----------------------|------------------------------------------|--------------------------------------|
| `id`              | UUID                  | PK, auto-generated                       | Unique execution identifier          |
| `configurationId` | UUID                  | FK -> `report_configurations.id`, Cascade | Parent configuration               |
| `status`          | ReportExecutionStatus | Default: `PENDING`                       | Execution state                      |
| `format`          | ReportFormat          | Required                                 | Output format (PDF, CSV, etc.)       |
| `filePath`        | String                | Optional                                 | Path to generated output file        |
| `generatedAt`     | DateTime              | Optional                                 | When generation completed            |
| `error`           | String                | Optional                                 | Error message if execution failed    |
| `createdAt`       | DateTime              | Default: `now()`                         | Record creation timestamp            |

**Relationships**:
- `configuration` -> `ReportConfiguration` (many-to-one, Cascade delete)

---

## 6. Key Design Patterns

### 6.1 Soft Deletes

Rather than physically removing records, several models use an `isActive` boolean flag:

- **User.isActive**: Deactivated users cannot log in but their historical data (audit logs, assessments) is preserved.
- **Entity.isActive**: Inactive entities are excluded from current operations but remain linked to historical assessments and commitments.
- **Donor.isActive**: Deactivated donors retain their commitment history for reporting and auditing.
- **GapFieldSeverity.isActive**: Severity rules can be deactivated without removal, allowing seasonal or situational toggling.

This pattern ensures referential integrity is maintained across the system while allowing administrative control over which records participate in active workflows.

### 6.2 JSON Columns for Flexibility

The schema uses PostgreSQL `Json` columns extensively for data that is semi-structured, extensible, or varies by context:

- **Coordinates** (`Entity.coordinates`, `Incident.coordinates`, `RapidAssessment.coordinates`): Stored as `{lat, lng}` objects, avoiding the need for PostGIS extension while remaining parseable.
- **Gap Analysis** (`RapidAssessment.gapAnalysis`): Computed analysis output that varies in structure by assessment type.
- **Items and Resources** (`RapidResponse.items`, `RapidResponse.resources`, `DonorCommitment.items`): Line-item data with quantities, descriptions, and unit types that vary by response type.
- **Timeline** (`RapidResponse.timeline`): Milestone-based timeline data for response tracking.
- **Metadata** (`Entity.metadata`): Extensible key-value attributes for entities that differ by `EntityType`.
- **Report Configuration** (`ReportConfiguration.filters`, `aggregations`, `visualizations`): Dynamic query and display configuration that changes per report type.
- **Audit Snapshots** (`AuditLog.oldValues`, `AuditLog.newValues`): Before and after state snapshots for change tracking.

This approach reduces the frequency of schema migrations for data shape changes while leveraging PostgreSQL's native JSON indexing capabilities for query performance.

### 6.3 UUID Primary Keys

All models use UUID v4 as their primary key strategy. This choice supports the offline-first architecture:

- Records can be created on client devices without contacting the server for ID assignment.
- Merging data from multiple offline clients does not produce ID collisions.
- IDs are non-sequential, preventing enumeration-based information leakage in APIs.

The trade-off is larger index sizes and slightly slower joins compared to integer keys, which is acceptable given the scale and security requirements of the system.

### 6.4 Junction Tables for Many-to-Many Relationships

The schema uses explicit junction tables with additional metadata rather than implicit many-to-many relations:

- **UserRole**: Adds `assignedAt` and `assignedBy` to track when and by whom a role was assigned.
- **RolePermission**: Simple junction with composite unique constraint.
- **EntityAssignment**: Adds `assignedAt` and `assignedBy` for assignment auditing.
- **PreliminaryAssessmentEntity**: Links assessments to multiple affected entities with `createdAt` tracking.

These junction tables use composite unique constraints (`@@unique`) to prevent duplicate associations and cascade deletes to maintain referential integrity.

### 6.5 Shared-Key One-to-One Relationships

Sector assessments (HealthAssessment, PopulationAssessment, FoodAssessment, WASHAssessment, ShelterAssessment, SecurityAssessment) use the RapidAssessment ID as their own primary key. This shared-key pattern:

- Enforces a strict one-to-one cardinality at the database level.
- Eliminates the need for a separate foreign key column and index.
- Simplifies queries since the assessment ID is the same in both tables.
- Uses `onDelete: Cascade` to ensure sector data is removed when the parent assessment is deleted.

### 6.6 Offline-First Sync Tracking

Assessment and Response models include fields specifically designed for offline operation:

- **isOfflineCreated**: Boolean flag indicating the record was created without server connectivity.
- **syncStatus**: Enum tracking the synchronization lifecycle (LOCAL -> PENDING -> SYNCING -> SYNCED, with FAILED and CONFLICT error states).
- **offlineId** (RapidResponse only): A client-generated unique identifier that allows the server to detect and deduplicate records that were synced multiple times.
- **versionNumber**: Optimistic concurrency control to detect conflicting edits.
- **SyncConflict**: Dedicated model for logging and resolving data conflicts, capturing both winning and losing versions.

### 6.7 Optimistic Concurrency with Version Numbers

Both `RapidAssessment` and `RapidResponse` include a `versionNumber` field (defaulting to 1). This supports optimistic concurrency control where:

1. The client reads a record along with its version number.
2. The client modifies the record locally.
3. On sync, the server checks if the version number matches.
4. If the version differs, a conflict is detected and logged to `SyncConflict`.
5. If the version matches, the update is applied and the version is incremented.

### 6.8 Workflow Status Tracking

Multiple models implement multi-stage workflow states using dedicated enums:

- **AssessmentStatus** (DRAFT -> SUBMITTED -> VERIFIED -> PUBLISHED): Controls the assessment review pipeline.
- **VerificationStatus** (DRAFT -> SUBMITTED -> VERIFIED/AUTO_VERIFIED/REJECTED): Enables both manual and automated verification, with explicit rejection handling including `rejectionReason` and `rejectionFeedback` fields.
- **CommitmentStatus** (PLANNED -> PARTIAL -> COMPLETE/CANCELLED): Tracks donor commitment fulfillment progress.
- **ResponseStatus** (PLANNED -> DELIVERED): Simple two-state response lifecycle.

Each workflow state transition is timestamped (e.g., `verifiedAt`) and attributed to a specific user (e.g., `verifiedBy`), providing a complete audit trail.
