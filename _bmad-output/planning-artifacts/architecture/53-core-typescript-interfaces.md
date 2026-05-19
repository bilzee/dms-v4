# 5.3 Core TypeScript Interfaces

### User & Role Management

```typescript
// src/types/entities.ts

export interface User {
  id: string; // UUID
  email: string;
  username: string;
  passwordHash: string;
  name: string;
  phone?: string;
  organization?: string;
  
  // Relationships
  roles: UserRole[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  isLocked: boolean;
}

export interface Role {
  id: string;
  name: RoleName;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  
  // Relationships
  user: User;
  role: Role;
  
  // Metadata
  assignedAt: Date;
  assignedBy: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string; // e.g., "CREATE_ASSESSMENT"
  category: string; // e.g., "ASSESSMENT", "VERIFICATION"
  description: string;
}

export enum RoleName {
  ASSESSOR = 'ASSESSOR',
  COORDINATOR = 'COORDINATOR',
  RESPONDER = 'RESPONDER',
  DONOR = 'DONOR',
  ADMIN = 'ADMIN'
}
```

### Incident & Preliminary Assessment

```typescript
export interface Incident {
  id: string;
  name: string;
  type: IncidentType;
  subType?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  
  // Dates
  declarationDate: Date;
  containedDate?: Date;
  resolvedDate?: Date;
  
  // Location
  locationCoordinates?: {
    latitude: number;
    longitude: number;
  };
  
  // Impact (aggregated from preliminary assessments)
  affectedPopulation?: number;
  
  // Relationships
  preliminaryAssessments: PreliminaryAssessment[];
  affectedEntities: IncidentEntity[];
  
  // Metadata
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PreliminaryAssessment {
  id: string;
  incidentId?: string; // Nullable - can exist before incident created
  
  // Assessment details
  assessmentDate: Date;
  assessorId: string;
  impactDescription: string;
  initialNeeds: string;
  
  // Trigger incident creation
  canTriggerIncident: boolean;
  
  // Status
  verificationStatus: VerificationStatus;
  
  // Impact data
  livesLost: number;
  injured: number;
  displaced: number;
  housesAffected: number;
  
  // Location
  locationCoordinates: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  lga: string;
  ward: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export enum IncidentType {
  FLOOD = 'FLOOD',
  FIRE = 'FIRE',
  LANDSLIDE = 'LANDSLIDE',
  CYCLONE = 'CYCLONE',
  CONFLICT = 'CONFLICT',
  EPIDEMIC = 'EPIDEMIC',
  OTHER = 'OTHER'
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum IncidentStatus {
  ACTIVE = 'ACTIVE',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED'
}
```

### Affected Entity & Assignment

```typescript
export interface AffectedEntity {
  id: string;
  name: string;
  type: EntityType;
  
  // Location
  locationCoordinates: {
    latitude: number;
    longitude: number;
  };
  lga: string;
  ward: string;
  
  // Population (from latest population assessment)
  population?: number;
  vulnerableCount?: number;
  
  // Auto-approval configuration
  autoApproveEnabled: boolean;
  
  // Camp-specific fields (if type = CAMP)
  campDetails?: {
    campName: string;
    campStatus: 'OPEN' | 'CLOSED';
    coordinatorName: string;
    coordinatorPhone: string;
    supervisorName?: string;
    supervisorOrganization?: string;
  };
  
  // Community-specific fields (if type = COMMUNITY)
  communityDetails?: {
    communityName: string;
    contactPersonName: string;
    contactPersonPhone: string;
    contactPersonRole: string;
    estimatedHouseholds?: number;
  };
  
  // Relationships
  incidents: IncidentEntity[];
  assessments: RapidAssessment[];
  responses: RapidResponse[];
  assignments: EntityAssignment[];
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityAssignment {
  id: string;
  entityId: string;
  userId: string;
  role: AssignmentRole; // ASSESSOR, RESPONDER, DONOR
  
  // Relationships
  entity: AffectedEntity;
  user: User;
  
  // Metadata
  assignedBy: string;
  assignedAt: Date;
  isActive: boolean;
}

export interface IncidentEntity {
  incidentId: string;
  entityId: string;
  
  // Relationships
  incident: Incident;
  entity: AffectedEntity;
  
  // Impact
  affectedDate: Date;
  severityLevel: IncidentSeverity;
}

export enum EntityType {
  CAMP = 'CAMP',
  COMMUNITY = 'COMMUNITY'
}

export enum AssignmentRole {
  ASSESSOR = 'ASSESSOR',
  RESPONDER = 'RESPONDER',
  DONOR = 'DONOR'
}
```

### Rapid Assessment

```typescript
export interface RapidAssessment {
  id: string;
  
  // Links
  entityId: string;
  incidentId: string;
  assessorId: string;
  
  // Assessment metadata
  assessmentType: AssessmentType;
  assessmentDate: Date;
  
  // Status tracking
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  rejectionFeedback?: string;
  syncStatus: SyncStatus;
  
  // Offline tracking
  offlineId?: string; // UUID generated on device
  versionNumber: number;
  
  // Assessment data (type-specific JSON)
  assessmentData: HealthAssessmentData 
    | WashAssessmentData 
    | ShelterAssessmentData 
    | FoodAssessmentData 
    | SecurityAssessmentData 
    | PopulationAssessmentData;
  
  // Media
  mediaAttachments: MediaAttachment[];
  
  // Relationships
  affectedEntity: AffectedEntity;
  incident: Incident;
  assessor: User;
  responses: RapidResponse[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export enum AssessmentType {
  HEALTH = 'HEALTH',
  WASH = 'WASH',
  SHELTER = 'SHELTER',
  FOOD = 'FOOD',
  SECURITY = 'SECURITY',
  POPULATION = 'POPULATION'
}

// Type-specific assessment data structures
export interface HealthAssessmentData {
  // Boolean gap indicators
  hasFunctionalClinic: boolean; // gap if FALSE
  hasEmergencyServices: boolean; // gap if FALSE
  hasMedicalSupplies: boolean; // gap if FALSE
  hasTrainedStaff: boolean; // gap if FALSE
  
  // Quantities
  numberHealthFacilities: number;
  healthFacilityTypes: string[];
  qualifiedHealthWorkers: number;
  commonHealthIssues: string[];
  
  // Additional
  hasMaternalChildServices: boolean;
  additionalDetails?: string;
}

export interface WashAssessmentData {
  // Boolean gap indicators
  isWaterSufficient: boolean; // gap if FALSE
  hasCleanWaterAccess: boolean; // gap if FALSE
  areLatrinesSufficient: boolean; // gap if FALSE
  hasHandwashingFacilities: boolean; // gap if FALSE
  
  // Details
  waterSources: string[];
  waterQuality: 'SAFE' | 'CONTAMINATED' | 'UNKNOWN';
  numberToilets: number;
  toiletTypes: string[];
  hasSolidWasteDisposal: boolean;
  
  additionalDetails?: string;
}

export interface ShelterAssessmentData {
  // Boolean gap indicators
  areSheltersSufficient: boolean; // gap if FALSE
  hasSafeStructures: boolean; // gap if FALSE
  hasWeatherProtection: boolean; // gap if FALSE
  
  // Details
  shelterTypes: string[];
  numberShelters: number;
  shelterCondition: 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  needsRepair: boolean;
  needsTarpaulin: boolean;
  needsBedding: boolean;
  
  additionalDetails?: string;
}

export interface FoodAssessmentData {
  // Boolean gap indicators
  isFoodSufficient: boolean; // gap if FALSE
  hasRegularMealAccess: boolean; // gap if FALSE
  hasInfantNutrition: boolean; // gap if FALSE
  
  // Details
  foodSources: string[];
  availableFoodDurationDays: number;
  additionalFoodRequiredPersons: number;
  additionalFoodRequiredHouseholds: number;
  malnutritionCases: number;
  feedingProgramExists: boolean;
  
  additionalDetails?: string;
}

export interface SecurityAssessmentData {
  // Boolean gap indicators
  isSafeFromViolence: boolean; // gap if FALSE
  hasSecurityPresence: boolean; // gap if FALSE
  hasLighting: boolean; // gap if FALSE
  
  // Details
  securityThreats: string[];
  securityProvider?: string;
  incidentsReported: number;
  restrictedMovement: boolean;
  
  additionalDetails?: string;
}

export interface PopulationAssessmentData {
  // Population breakdown
  totalHouseholds: number;
  totalPopulation: number;
  populationMale: number;
  populationFemale: number;
  populationUnder5: number;
  
  // Vulnerable groups
  pregnantWomen: number;
  lactatingMothers: number;
  personWithDisability: number;
  elderlyPersons: number;
  separatedChildren: number;
  
  // Impact
  numberLivesLost: number;
  numberInjured: number;
  
  additionalDetails?: string;
}

export enum VerificationStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  AUTO_VERIFIED = 'AUTO_VERIFIED',
  REJECTED = 'REJECTED'
}

export enum SyncStatus {
  LOCAL = 'LOCAL',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  CONFLICT = 'CONFLICT',
  FAILED = 'FAILED'
}
```

### Rapid Response

```typescript
export interface RapidResponse {
  id: string;
  
  // Links (immutable after creation)
  assessmentId: string;
  entityId: string;
  responderId: string;
  donorId?: string; // Nullable - may not have donor
  
  // Response metadata
  status: ResponseStatus; // PLANNED or DELIVERED
  plannedDate: Date;
  responseDate?: Date; // Set when status = DELIVERED
  
  // Verification
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  rejectionFeedback?: string;
  syncStatus: SyncStatus;
  
  // Offline tracking
  offlineId?: string;
  versionNumber: number;
  
  // Response items (simplified - not type-specific)
  items: ResponseItem[];
  
  // Media evidence
  mediaAttachments: MediaAttachment[];
  
  // Relationships
  assessment: RapidAssessment;
  affectedEntity: AffectedEntity;
  responder: User;
  donor?: Donor;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ResponseItem {
  name: string;
  unit: string;
  quantity: number;
  donorName?: string; // Can be typed in
  donorCommitmentId?: string; // Link if imported
}

export enum ResponseStatus {
  PLANNED = 'PLANNED',
  DELIVERED = 'DELIVERED'
}
```

### Donor Management

```typescript
export interface Donor {
  id: string;
  organizationName: string;
  contactName: string;
  email: string;
  phone?: string;
  
  // Performance metrics (calculated)
  totalCommitments: number;
  totalDelivered: number;
  selfReportedDeliveryRate: number; // Percentage
  verifiedDeliveryRate: number; // Percentage
  leaderboardRank: number;
  
  // Relationships
  commitments: DonorCommitment[];
  responses: RapidResponse[];
  entityAssignments: EntityAssignment[];
  
  // Metadata
  registrationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DonorCommitment {
  id: string;
  donorId: string;
  entityId: string;
  incidentId: string;
  
  // Commitment details
  commitmentDate: Date;
  items: CommitmentItem[];
  totalValueEstimated?: number;
  
  // Delivery tracking
  deliveryStatus: DeliveryStatus;
  deliveredQuantity: number; // Sum of items
  verifiedDeliveredQuantity: number; // From verified responses
  
  // Relationships
  donor: Donor;
  entity: AffectedEntity;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface CommitmentItem {
  name: string;
  unit: string;
  quantity: number;
  delivered: number; // Tracking partial delivery
}

export enum DeliveryStatus {
  PLANNED = 'PLANNED',
  PARTIAL = 'PARTIAL',
  COMPLETE = 'COMPLETE'
}
```

### Media & Sync Management

```typescript
export interface MediaAttachment {
  id: string;
  
  // Storage
  url?: string; // R2/S3 URL after sync
  localPath?: string; // Local device path before sync
  thumbnailUrl?: string;
  
  // File metadata
  mimeType: string;
  size: number;
  filename: string;
  
  // Capture metadata
  metadata: {
    gpsCoordinates?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    timestamp: Date;
    captureMethod: 'GPS' | 'MANUAL' | 'MAP_SELECT';
  };
  
  // Links
  assessmentId?: string;
  responseId?: string;
  
  // Sync
  syncStatus: SyncStatus;
  
  // Relationships
  assessment?: RapidAssessment;
  response?: RapidResponse;
  
  // Metadata
  createdAt: Date;
  uploadedAt?: Date;
}

export interface SyncConflict {
  id: string;
  
  // Conflict details
  entityType: 'ASSESSMENT' | 'RESPONSE';
  entityId: string;
  conflictDate: Date;
  
  // Resolution
  resolutionMethod: 'LAST_WRITE_WINS';
  winningVersion: any; // JSON of winning data
  losingVersion: any; // JSON of losing data
  resolvedAt: Date;
  
  // Notification
  coordinatorNotified: boolean;
  coordinatorNotifiedAt?: Date;
  
  // Metadata
  createdAt: Date;
}

export interface OfflineQueueItem {
  id: string; // Local UUID
  type: 'ASSESSMENT' | 'RESPONSE' | 'MEDIA';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityId?: string; // Server ID if updating
  data: any; // The actual data to sync
  retryCount: number;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  createdAt: Date;
  lastAttempt?: Date;
  error?: string;
}
```

### Audit Trail

```typescript
export interface AuditLog {
  id: string;
  userId: string;
  action: string; // e.g., "CREATE_ASSESSMENT", "VERIFY_RESPONSE"
  
  // Entity details
  entityType: string; // e.g., "RapidAssessment"
  entityId: string;
  
  // Changes
  beforeValue?: any; // JSON
  afterValue?: any; // JSON
  
  // Context
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  
  // Relationships
  user: User;
  
  // Metadata
  createdAt: Date;
}
```


---
