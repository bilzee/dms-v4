# 8. API Specification

### 8.1 API Design Principles

**RESTful Conventions:**
- Use HTTP methods semantically (GET, POST, PATCH, DELETE)
- Resource-based URLs: `/api/v1/{resource}/{id}/{action}`
- Plural nouns for collections: `/api/v1/assessments`
- Consistent status codes and error responses
- Versioned API: `/api/v1/` (ready for future versions)

**Standardized Response Format:**
```typescript
// src/types/api.ts

export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
    requestId: string;
  };
  error?: ApiError;
}

export interface ApiError {
  type: string;
  code: string;
  message: string;
  details?: any;
  stack?: string; // Only in development
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiResponse<T>['meta'] & {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  };
}
```

### 8.2 Authentication Endpoints

```yaml
# Authentication & Authorization
/api/v1/auth:
  /login:
    POST:
      body: { email: string, password: string }
      returns: { user: User, token: string, roles: Role[] }
      status: 200 | 401 | 422
      
  /logout:
    POST:
      headers: { Authorization: "Bearer {token}" }
      returns: { success: boolean }
      status: 200 | 401
      
  /refresh:
    POST:
      headers: { Authorization: "Bearer {token}" }
      returns: { token: string }
      status: 200 | 401
      
  /me:
    GET:
      headers: { Authorization: "Bearer {token}" }
      returns: { user: User, roles: Role[], permissions: Permission[] }
      status: 200 | 401
```

**Implementation Pattern:**
```typescript
// app/api/v1/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { comparePassword, generateToken } from '@/lib/auth/utils';
import { ApiResponse } from '@/types/api';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = LoginSchema.parse(body);
    
    // Find user with roles
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });
    
    if (!user || !user.isActive) {
      return NextResponse.json<ApiResponse<null>>({
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: crypto.randomUUID(),
        },
        error: {
          type: 'authentication_error',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      }, { status: 401 });
    }
    
    // Verify password
    const isValid = await comparePassword(validated.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json<ApiResponse<null>>({
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: crypto.randomUUID(),
        },
        error: {
          type: 'authentication_error',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      }, { status: 401 });
    }
    
    // Generate JWT token
    const roles = user.roles.map(ur => ur.role);
    const permissions = roles.flatMap(r => r.permissions.map(p => p.code));
    
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roles: roles.map(r => r.name),
      permissions: [...new Set(permissions)],
    });
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    
    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = user;
    
    return NextResponse.json<ApiResponse<any>>({
      data: {
        user: userWithoutPassword,
        token,
        roles: roles.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
        })),
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID(),
      },
    }, { status: 200 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<null>>({
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: crypto.randomUUID(),
        },
        error: {
          type: 'validation_error',
          code: 'INVALID_INPUT',
          message: 'Validation failed',
          details: error.errors,
        },
      }, { status: 422 });
    }
    
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse<null>>({
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID(),
      },
      error: {
        type: 'server_error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    }, { status: 500 });
  }
}
```

### 8.3 Assessment Endpoints

```yaml
/api/v1/assessments:
  GET:
    query:
      - entityId?: string
      - incidentId?: string
      - assessmentType?: AssessmentType
      - verificationStatus?: VerificationStatus
      - syncStatus?: SyncStatus
      - page?: number (default: 1)
      - pageSize?: number (default: 20)
    returns: PaginatedResponse<RapidAssessment>
    status: 200 | 401 | 403
    
  POST:
    body: CreateAssessmentInput
    returns: ApiResponse<RapidAssessment>
    status: 201 | 401 | 403 | 422
    
  /batch:
    POST:
      body: { assessments: CreateAssessmentInput[] }
      returns: ApiResponse<BatchResult>
      status: 200 | 401 | 403 | 422
      
  /{id}:
    GET:
      returns: ApiResponse<RapidAssessment>
      status: 200 | 401 | 403 | 404
      
    PATCH:
      body: UpdateAssessmentInput
      returns: ApiResponse<RapidAssessment>
      status: 200 | 401 | 403 | 404 | 422
      
    DELETE:
      returns: ApiResponse<{ deleted: boolean }>
      status: 200 | 401 | 403 | 404
      
  /{id}/verify:
    POST:
      body: { action: 'approve' | 'reject', reason?: string, feedback?: string }
      returns: ApiResponse<RapidAssessment>
      status: 200 | 401 | 403 | 404 | 422
```

**Assessment Creation Schema:**
```typescript
// lib/validation/schemas.ts

import { z } from 'zod';

// Base assessment schema
export const CreateAssessmentSchema = z.object({
  entityId: z.string().uuid(),
  incidentId: z.string().uuid(),
  assessmentType: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']),
  assessmentDate: z.string().datetime().or(z.date()),
  assessmentData: z.object({}).passthrough(), // Type-specific validation below
  offlineId: z.string().uuid().optional(),
  versionNumber: z.number().int().positive().default(1),
});

// Health assessment data schema
export const HealthAssessmentDataSchema = z.object({
  hasFunctionalClinic: z.boolean(),
  hasEmergencyServices: z.boolean(),
  hasMedicalSupplies: z.boolean(),
  hasTrainedStaff: z.boolean(),
  numberHealthFacilities: z.number().int().nonnegative(),
  healthFacilityTypes: z.array(z.string()),
  qualifiedHealthWorkers: z.number().int().nonnegative(),
  commonHealthIssues: z.array(z.string()),
  hasMaternalChildServices: z.boolean(),
  additionalDetails: z.string().optional(),
});

// WASH assessment data schema
export const WashAssessmentDataSchema = z.object({
  isWaterSufficient: z.boolean(),
  hasCleanWaterAccess: z.boolean(),
  areLatrinesSufficient: z.boolean(),
  hasHandwashingFacilities: z.boolean(),
  waterSources: z.array(z.string()),
  waterQuality: z.enum(['SAFE', 'CONTAMINATED', 'UNKNOWN']),
  numberToilets: z.number().int().nonnegative(),
  toiletTypes: z.array(z.string()),
  hasSolidWasteDisposal: z.boolean(),
  additionalDetails: z.string().optional(),
});

// Similar schemas for other assessment types...

// Dynamic validation based on assessment type
export function validateAssessmentData(type: string, data: any) {
  switch (type) {
    case 'HEALTH':
      return HealthAssessmentDataSchema.parse(data);
    case 'WASH':
      return WashAssessmentDataSchema.parse(data);
    // ... other cases
    default:
      throw new Error(`Unknown assessment type: ${type}`);
  }
}
```

### 8.4 Response Endpoints

```yaml
/api/v1/responses:
  GET:
    query:
      - entityId?: string
      - assessmentId?: string
      - responderId?: string
      - status?: ResponseStatus
      - verificationStatus?: VerificationStatus
      - page?: number
      - pageSize?: number
    returns: PaginatedResponse<RapidResponse>
    status: 200 | 401 | 403
    
  POST:
    body: CreateResponseInput
    returns: ApiResponse<RapidResponse>
    status: 201 | 401 | 403 | 422
    
  /batch:
    POST:
      body: { responses: CreateResponseInput[] }
      returns: ApiResponse<BatchResult>
      status: 200 | 401 | 403 | 422
      
  /{id}:
    GET:
      returns: ApiResponse<RapidResponse>
      status: 200 | 401 | 403 | 404
      
    PATCH:
      body: UpdateResponseInput
      returns: ApiResponse<RapidResponse>
      status: 200 | 401 | 403 | 404 | 422
      
  /{id}/deliver:
    POST:
      body: { responseDate: string, mediaAttachments?: MediaInput[] }
      returns: ApiResponse<RapidResponse>
      status: 200 | 401 | 403 | 404 | 422
      note: Converts status from PLANNED to DELIVERED
      
  /{id}/verify:
    POST:
      body: { action: 'approve' | 'reject', reason?: string, feedback?: string }
      returns: ApiResponse<RapidResponse>
      status: 200 | 401 | 403 | 404 | 422
```

**Response Creation Schema:**
```typescript
export const CreateResponseSchema = z.object({
  assessmentId: z.string().uuid(),
  entityId: z.string().uuid(),
  status: z.enum(['PLANNED', 'DELIVERED']).default('PLANNED'),
  plannedDate: z.string().datetime().or(z.date()),
  responseDate: z.string().datetime().or(z.date()).optional(),
  items: z.array(z.object({
    name: z.string().min(1),
    unit: z.string().min(1),
    quantity: z.number().positive(),
    donorName: z.string().optional(),
    donorCommitmentId: z.string().uuid().optional(),
  })).min(1),
  donorId: z.string().uuid().optional(),
  offlineId: z.string().uuid().optional(),
  versionNumber: z.number().int().positive().default(1),
});

// Validation: entityId must match assessment's entityId
export async function validateResponseEntity(assessmentId: string, entityId: string) {
  const assessment = await prisma.rapidAssessment.findUnique({
    where: { id: assessmentId },
    select: { entityId: true },
  });
  
  if (!assessment) {
    throw new Error('Assessment not found');
  }
  
  if (assessment.entityId !== entityId) {
    throw new Error('Response entity must match assessment entity');
  }
}
```

### 8.5 Verification Endpoints

```yaml
/api/v1/verification:
  /queue:
    GET:
      query:
        - type?: 'assessment' | 'response'
        - priority?: 'high' | 'normal' | 'low'
        - entityId?: string
        - page?: number
        - pageSize?: number
      returns: PaginatedResponse<VerificationQueueItem>
      status: 200 | 401 | 403
      
  /batch-verify:
    POST:
      body: {
        items: Array<{
          id: string,
          type: 'assessment' | 'response',
          action: 'approve' | 'reject',
          reason?: string,
          feedback?: string
        }>
      }
      returns: ApiResponse<BatchVerificationResult>
      status: 200 | 401 | 403 | 422
```

### 8.6 Entity Management Endpoints

```yaml
/api/v1/entities:
  GET:
    query:
      - type?: EntityType
      - lga?: string
      - ward?: string
      - incidentId?: string
      - bbox?: string (lat1,lng1,lat2,lng2)
      - page?: number
      - pageSize?: number
    returns: PaginatedResponse<AffectedEntity>
    status: 200 | 401 | 403
    
  POST:
    body: CreateEntityInput
    returns: ApiResponse<AffectedEntity>
    status: 201 | 401 | 403 | 422
    
  /{id}:
    GET:
      returns: ApiResponse<AffectedEntity>
      status: 200 | 401 | 403 | 404
      
    PATCH:
      body: UpdateEntityInput
      returns: ApiResponse<AffectedEntity>
      status: 200 | 401 | 403 | 404 | 422
      
  /{id}/assessments:
    GET:
      query: { type?: AssessmentType, status?: VerificationStatus }
      returns: PaginatedResponse<RapidAssessment>
      status: 200 | 401 | 403 | 404
      
  /{id}/responses:
    GET:
      query: { status?: ResponseStatus }
      returns: PaginatedResponse<RapidResponse>
      status: 200 | 401 | 403 | 404
      
  /{id}/gap-analysis:
    GET:
      returns: ApiResponse<GapAnalysisResult>
      status: 200 | 401 | 403 | 404
      note: Calculates gaps from latest assessments
      
  /{id}/assignments:
    GET:
      returns: ApiResponse<EntityAssignment[]>
      status: 200 | 401 | 403 | 404
      
    POST:
      body: { userId: string, role: AssignmentRole }
      returns: ApiResponse<EntityAssignment>
      status: 201 | 401 | 403 | 404 | 422
      
    DELETE:
      query: { userId: string, role: AssignmentRole }
      returns: ApiResponse<{ deleted: boolean }>
      status: 200 | 401 | 403 | 404
      
  /{id}/auto-approval:
    PATCH:
      body: { enabled: boolean }
      returns: ApiResponse<AffectedEntity>
      status: 200 | 401 | 403 | 404
      permission: CONFIG_AUTO_APPROVAL
```

### 8.7 Synchronization Endpoints

```yaml
/api/v1/sync:
  /status:
    GET:
      returns: ApiResponse<{
        queueSize: number,
        lastSync: string,
        conflicts: number,
        failedItems: number
      }>
      status: 200 | 401
      
  /push:
    POST:
      body: {
        changes: Array<{
          type: 'assessment' | 'response' | 'media',
          action: 'create' | 'update' | 'delete',
          data: any,
          offlineId?: string,
          versionNumber: number
        }>
      }
      returns: ApiResponse<{
        successful: SyncResult[],
        conflicts: ConflictResult[],
        failed: FailedResult[]
      }>
      status: 200 | 401 | 422
      
  /pull:
    GET:
      query: {
        lastSyncTimestamp?: string,
        entities?: string[] (comma-separated entity IDs)
      }
      returns: ApiResponse<{
        assessments: RapidAssessment[],
        responses: RapidResponse[],
        entities: AffectedEntity[],
        syncTimestamp: string
      }>
      status: 200 | 401
      
  /conflicts:
    GET:
      query: { resolved?: boolean, page?: number }
      returns: PaginatedResponse<SyncConflict>
      status: 200 | 401 | 403
```

### 8.8 Dashboard Data Endpoints

```yaml
/api/v1/dashboard:
  /crisis:
    GET:
      returns: ApiResponse<{
        assessmentQueue: QueueItem[],
        responseQueue: QueueItem[],
        conflicts: ConflictItem[],
        metrics: {
          pendingAssessments: number,
          pendingResponses: number,
          autoApprovedToday: number,
          averageVerificationTime: number
        }
      }>
      status: 200 | 401 | 403
      refresh: <30 seconds
      
  /situation:
    GET:
      query: { incidentId: string, entityId?: string }
      returns: ApiResponse<{
        incident: Incident,
        entities: AffectedEntity[],
        assessments: Record<string, RapidAssessment[]>, // keyed by entityId
        gapAnalysis: GapAnalysisResult[],
        populationMetrics: PopulationMetrics
      }>
      status: 200 | 401 | 403
      
  /donor:
    GET:
      query: { donorId: string }
      returns: ApiResponse<{
        commitments: DonorCommitment[],
        responses: RapidResponse[],
        performance: {
          rank: number,
          totalCommitments: number,
          deliveryRate: number,
          verifiedRate: number
        },
        leaderboard: DonorLeaderboardEntry[]
      }>
      status: 200 | 401 | 403
```

### 8.9 Donor Management Endpoints

```yaml
/api/v1/donors:
  GET:
    query: { page?: number, pageSize?: number, sortBy?: 'rank' | 'commitments' | 'deliveryRate' }
    returns: PaginatedResponse<Donor>
    status: 200 | 401
    
  POST:
    body: CreateDonorInput
    returns: ApiResponse<Donor>
    status: 201 | 422
    
  /{id}/commitments:
    GET:
      returns: ApiResponse<DonorCommitment[]>
      status: 200 | 401 | 403 | 404
      
    POST:
      body: {
        entityId: string,
        incidentId: string,
        items: Array<{ name: string, unit: string, quantity: number }>
      }
      returns: ApiResponse<DonorCommitment>
      status: 201 | 401 | 403 | 422
      
  /{id}/leaderboard:
    GET:
      returns: ApiResponse<{
        currentRank: number,
        totalDonors: number,
        topDonors: DonorLeaderboardEntry[],
        performance: DonorPerformance
      }>
      status: 200 | 401 | 403 | 404
```

---
