# 9. Backend Services

### 9.1 Supabase Client Setup

// lib/db/supabase.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role (bypasses RLS)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

### 9.2 Authentication Service

```typescript
// lib/auth/service.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/client';

export class AuthService {
  private static JWT_SECRET = process.env.JWT_SECRET!;
  private static JWT_EXPIRES_IN = '24h';
  
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
  
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  static generateToken(payload: {
    userId: string;
    email: string;
    roles: string[];
    permissions: string[];
  }): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }
  
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  static async getUserWithRoles(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
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
  }
  
  static async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const user = await this.getUserWithRoles(userId);
    if (!user) return false;
    
    const permissions = user.roles.flatMap(ur =>
      ur.role.permissions.map(p => p.code)
    );
    
    return permissions.includes(permissionCode);
  }
  
  static async hasRole(userId: string, roleName: string): Promise<boolean> {
    const user = await this.getUserWithRoles(userId);
    if (!user) return false;
    
    return user.roles.some(ur => ur.role.name === roleName);
  }
}
```

### 9.3 Authorization Middleware

```typescript
// lib/auth/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './service';

export function withAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({
          error: {
            type: 'authentication_error',
            code: 'MISSING_TOKEN',
            message: 'Authorization token required',
          },
        }, { status: 401 });
      }
      
      const token = authHeader.substring(7);
      const payload = AuthService.verifyToken(token);
      
      // Get fresh user data
      const user = await AuthService.getUserWithRoles(payload.userId);
      if (!user || !user.isActive) {
        return NextResponse.json({
          error: {
            type: 'authentication_error',
            code: 'USER_INACTIVE',
            message: 'User account is inactive',
          },
        }, { status: 401 });
      }
      
      // Build context
      const context: AuthContext = {
        user,
        userId: user.id,
        roles: user.roles.map(ur => ur.role.name),
        permissions: user.roles.flatMap(ur =>
          ur.role.permissions.map(p => p.code)
        ),
      };
      
      return await handler(req, context);
    } catch (error) {
      return NextResponse.json({
        error: {
          type: 'authentication_error',
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      }, { status: 401 });
    }
  };
}

interface AuthContext {
  user: any;
  userId: string;
  roles: string[];
  permissions: string[];
}
```

### 9.4 API Route Authentication Patterns

#### **✅ Recommended Pattern: Manual Role Check**
This pattern works with Next.js 14.2.5 and is compatible with async route params.

```typescript
// app/api/v1/assessments/[id]/verify/route.ts

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { user, roles } = context;
  
  // Manual role check - works with Next.js 14.2.5
  if (!roles.includes('COORDINATOR')) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Insufficient permissions. Coordinator role required.' 
      },
      { status: 403 }
    );
  }
  
  const { id } = context.params.id; // Direct param access
  const body = await request.json();
  
  // ... implementation
});
```

#### **⚠️ Deprecated: Decorator Pattern**
The decorator pattern shown below is **incompatible with Next.js 14.2.5 async params** and should not be used.

```typescript
// ❌ DEPRECATED - Broken with Next.js 14.2.5
export const POST = withAuth(requireRole('COORDINATOR')(async (request, context, { params }) => {
  // This pattern fails due to async params incompatibility
}));
```

#### **Role-Based Authorization Examples**

```typescript
// Multiple role check
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { roles } = context;
  
  const allowedRoles = ['COORDINATOR', 'ADMIN'];
  if (!allowedRoles.some(role => roles.includes(role))) {
    return NextResponse.json(
      { error: 'Insufficient permissions. Coordinator or Admin role required.' },
      { status: 403 }
    );
  }
  
  // ... implementation
});

// Permission-based check
export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  const { permissions } = context;
  
  if (!permissions.includes('VERIFY_ASSESSMENT')) {
    return NextResponse.json(
      { error: 'Insufficient permissions. Verify Assessment permission required.' },
      { status: 403 }
    );
  }
  
  // ... implementation
});
```

### 9.4 Entity Assignment Service

```typescript
// lib/services/entity-assignment.service.ts

import { prisma } from '@/lib/db/client';
import { AssignmentRole } from '@prisma/client';

export class EntityAssignmentService {
  /**
   * Check if user is assigned to entity with specific role
   */
  static async isUserAssigned(
    userId: string,
    entityId: string,
    role?: AssignmentRole
  ): Promise<boolean> {
    const assignment = await prisma.entityAssignment.findFirst({
      where: {
        userId,
        entityId,
        ...(role && { role }),
        isActive: true,
      },
    });
    
    return !!assignment;
  }
  
  /**
   * Get all entities assigned to user
   */
  static async getUserEntities(
    userId: string,
    role?: AssignmentRole
  ) {
    return prisma.affectedEntity.findMany({
      where: {
        assignments: {
          some: {
            userId,
            ...(role && { role }),
            isActive: true,
          },
        },
      },
      include: {
        incidents: {
          include: {
            incident: true,
          },
        },
      },
    });
  }
  
  /**
   * Assign user to entity
   */
  static async assignUser(
    entityId: string,
    userId: string,
    role: AssignmentRole,
    assignedBy: string
  ) {
    // Check if already assigned
    const existing = await prisma.entityAssignment.findFirst({
      where: { entityId, userId, role },
    });
    
    if (existing) {
      // Reactivate if inactive
      if (!existing.isActive) {
        return prisma.entityAssignment.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
      }
      return existing;
    }
    
    // Create new assignment
    return prisma.entityAssignment.create({
      data: {
        entityId,
        userId,
        role,
        assignedBy,
      },
    });
  }
  
  /**
   * Remove user assignment
   */
  static async removeUser(
    entityId: string,
    userId: string,
    role: AssignmentRole
  ) {
    return prisma.entityAssignment.updateMany({
      where: { entityId, userId, role },
      data: { isActive: false },
    });
  }
  
  /**
   * Get all users assigned to entity
   */
  static async getEntityUsers(entityId: string, role?: AssignmentRole) {
    return prisma.user.findMany({
      where: {
        entityAssignments: {
          some: {
            entityId,
            ...(role && { role }),
            isActive: true,
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }
}
```



### 9.4 Auto-Approval Service (Continued)

```typescript
// lib/services/auto-approval.service.ts (continued)

import { prisma } from '@/lib/db/client';
import { VerificationStatus } from '@prisma/client';

export class AutoApprovalService {
  /**
   * Auto-approve response
   */
  static async autoApproveResponse(responseId: string) {
    return prisma.rapidResponse.update({
      where: { id: responseId },
      data: {
        verificationStatus: VerificationStatus.AUTO_VERIFIED,
      },
    });
  }
  
  /**
   * Toggle auto-approval for entity
   */
  static async toggleEntityAutoApproval(
    entityId: string,
    enabled: boolean,
    updatedBy: string
  ) {
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'TOGGLE_AUTO_APPROVAL',
        entityType: 'AffectedEntity',
        entityId,
        beforeValue: { autoApproveEnabled: !enabled },
        afterValue: { autoApproveEnabled: enabled },
        timestamp: new Date(),
      },
    });
    
    return prisma.affectedEntity.update({
      where: { id: entityId },
      data: { autoApproveEnabled: enabled },
    });
  }
}
```

### 9.5 Gap Analysis Service

```typescript
// lib/services/gap-analysis.service.ts

import { prisma } from '@/lib/db/client';
import { AssessmentType } from '@prisma/client';

export interface GapResult {
  assessmentType: AssessmentType;
  hasGaps: boolean;
  gapCount: number;
  severity: 'NONE' | 'MILD' | 'SEVERE';
  gapFields: string[];
  lastAssessmentDate: Date;
}

export interface EntityGapAnalysis {
  entityId: string;
  entityName: string;
  overallSeverity: 'NONE' | 'MILD' | 'SEVERE';
  totalGaps: number;
  assessmentGaps: GapResult[];
}

export class GapAnalysisService {
  // Gap-indicating fields by assessment type
  private static GAP_FIELDS: Record<AssessmentType, string[]> = {
    HEALTH: [
      'hasFunctionalClinic',
      'hasEmergencyServices',
      'hasMedicalSupplies',
      'hasTrainedStaff',
    ],
    WASH: [
      'isWaterSufficient',
      'hasCleanWaterAccess',
      'areLatrinesSufficient',
      'hasHandwashingFacilities',
    ],
    SHELTER: [
      'areSheltersSufficient',
      'hasSafeStructures',
      'hasWeatherProtection',
    ],
    FOOD: [
      'isFoodSufficient',
      'hasRegularMealAccess',
      'hasInfantNutrition',
    ],
    SECURITY: [
      'isSafeFromViolence',
      'hasSecurityPresence',
      'hasLighting',
    ],
    POPULATION: [], // No boolean gaps for population
  };
  
  /**
   * Analyze gaps for a single assessment
   */
  static analyzeAssessmentGaps(
    assessmentType: AssessmentType,
    assessmentData: any
  ): { gapCount: number; gapFields: string[] } {
    const gapFields = this.GAP_FIELDS[assessmentType] || [];
    const detectedGaps: string[] = [];
    
    for (const field of gapFields) {
      // Gap exists if field is FALSE
      if (assessmentData[field] === false) {
        detectedGaps.push(field);
      }
    }
    
    return {
      gapCount: detectedGaps.length,
      gapFields: detectedGaps,
    };
  }
  
  /**
   * Calculate severity based on gap count
   */
  static calculateSeverity(gapCount: number): 'NONE' | 'MILD' | 'SEVERE' {
    if (gapCount === 0) return 'NONE';
    if (gapCount === 1) return 'MILD';
    return 'SEVERE';
  }
  
  /**
   * Get latest assessment per type for entity
   */
  static async getLatestAssessments(entityId: string) {
    const assessmentTypes: AssessmentType[] = [
      'HEALTH',
      'WASH',
      'SHELTER',
      'FOOD',
      'SECURITY',
      'POPULATION',
    ];
    
    const latestAssessments = await Promise.all(
      assessmentTypes.map(async (type) => {
        return prisma.rapidAssessment.findFirst({
          where: {
            entityId,
            assessmentType: type,
            verificationStatus: {
              in: ['VERIFIED', 'AUTO_VERIFIED'],
            },
          },
          orderBy: { assessmentDate: 'desc' },
        });
      })
    );
    
    return latestAssessments.filter(Boolean);
  }
  
  /**
   * Analyze gaps for single entity
   */
  static async analyzeEntityGaps(entityId: string): Promise<EntityGapAnalysis> {
    const entity = await prisma.affectedEntity.findUnique({
      where: { id: entityId },
      select: { name: true },
    });
    
    if (!entity) {
      throw new Error('Entity not found');
    }
    
    const latestAssessments = await this.getLatestAssessments(entityId);
    
    const assessmentGaps: GapResult[] = latestAssessments.map((assessment) => {
      const { gapCount, gapFields } = this.analyzeAssessmentGaps(
        assessment.assessmentType,
        assessment.assessmentData
      );
      
      return {
        assessmentType: assessment.assessmentType,
        hasGaps: gapCount > 0,
        gapCount,
        severity: this.calculateSeverity(gapCount),
        gapFields,
        lastAssessmentDate: assessment.assessmentDate,
      };
    });
    
    // Calculate overall severity (worst among all assessments)
    const totalGaps = assessmentGaps.reduce((sum, g) => sum + g.gapCount, 0);
    const hasSevere = assessmentGaps.some((g) => g.severity === 'SEVERE');
    const hasMild = assessmentGaps.some((g) => g.severity === 'MILD');
    
    const overallSeverity = hasSevere ? 'SEVERE' : hasMild ? 'MILD' : 'NONE';
    
    return {
      entityId,
      entityName: entity.name,
      overallSeverity,
      totalGaps,
      assessmentGaps,
    };
  }
  
  /**
   * Analyze gaps for multiple entities (for incident view)
   */
  static async analyzeIncidentGaps(incidentId: string): Promise<EntityGapAnalysis[]> {
    // Get all entities affected by incident
    const incidentEntities = await prisma.incidentEntity.findMany({
      where: { incidentId },
      include: { entity: true },
    });
    
    // Analyze gaps for each entity
    const gapAnalyses = await Promise.all(
      incidentEntities.map((ie) => this.analyzeEntityGaps(ie.entityId))
    );
    
    return gapAnalyses;
  }
  
  /**
   * Get aggregated gap summary across all entities in incident
   */
  static async getIncidentGapSummary(incidentId: string) {
    const entityGaps = await this.analyzeIncidentGaps(incidentId);
    
    // Count entities by severity
    const severityCounts = {
      NONE: entityGaps.filter((g) => g.overallSeverity === 'NONE').length,
      MILD: entityGaps.filter((g) => g.overallSeverity === 'MILD').length,
      SEVERE: entityGaps.filter((g) => g.overallSeverity === 'SEVERE').length,
    };
    
    // Count gaps by assessment type
    const assessmentTypeCounts: Record<string, { NONE: number; MILD: number; SEVERE: number }> = {};
    
    for (const entityGap of entityGaps) {
      for (const assessmentGap of entityGap.assessmentGaps) {
        if (!assessmentTypeCounts[assessmentGap.assessmentType]) {
          assessmentTypeCounts[assessmentGap.assessmentType] = { NONE: 0, MILD: 0, SEVERE: 0 };
        }
        assessmentTypeCounts[assessmentGap.assessmentType][assessmentGap.severity]++;
      }
    }
    
    return {
      totalEntities: entityGaps.length,
      severityCounts,
      assessmentTypeCounts,
      totalGaps: entityGaps.reduce((sum, g) => sum + g.totalGaps, 0),
    };
  }
}
```

### 9.6 Verification Service

```typescript
// lib/services/verification.service.ts

import { prisma } from '@/lib/db/client';
import { VerificationStatus } from '@prisma/client';
import { AutoApprovalService } from './auto-approval.service';

export class VerificationService {
  /**
   * Verify assessment
   */
  static async verifyAssessment(
    assessmentId: string,
    action: 'approve' | 'reject',
    verifiedBy: string,
    reason?: string,
    feedback?: string
  ) {
    const assessment = await prisma.rapidAssessment.findUnique({
      where: { id: assessmentId },
    });
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }
    
    // Cannot reject auto-verified items
    if (assessment.verificationStatus === VerificationStatus.AUTO_VERIFIED) {
      throw new Error('Cannot reject auto-verified assessment');
    }
    
    const newStatus = action === 'approve' 
      ? VerificationStatus.VERIFIED 
      : VerificationStatus.REJECTED;
    
    // Update assessment
    const updated = await prisma.rapidAssessment.update({
      where: { id: assessmentId },
      data: {
        verificationStatus: newStatus,
        ...(action === 'reject' && {
          rejectionReason: reason,
          rejectionFeedback: feedback,
        }),
      },
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: verifiedBy,
        action: action === 'approve' ? 'VERIFY_ASSESSMENT' : 'REJECT_ASSESSMENT',
        entityType: 'RapidAssessment',
        entityId: assessmentId,
        beforeValue: { verificationStatus: assessment.verificationStatus },
        afterValue: { 
          verificationStatus: newStatus,
          ...(action === 'reject' && { rejectionReason: reason, rejectionFeedback: feedback }),
        },
        timestamp: new Date(),
      },
    });
    
    return updated;
  }
  
  /**
   * Verify response
   */
  static async verifyResponse(
    responseId: string,
    action: 'approve' | 'reject',
    verifiedBy: string,
    reason?: string,
    feedback?: string
  ) {
    const response = await prisma.rapidResponse.findUnique({
      where: { id: responseId },
      include: { donor: true },
    });
    
    if (!response) {
      throw new Error('Response not found');
    }
    
    // Cannot reject auto-verified items
    if (response.verificationStatus === VerificationStatus.AUTO_VERIFIED) {
      throw new Error('Cannot reject auto-verified response');
    }
    
    const newStatus = action === 'approve'
      ? VerificationStatus.VERIFIED
      : VerificationStatus.REJECTED;
    
    // Update response
    const updated = await prisma.rapidResponse.update({
      where: { id: responseId },
      data: {
        verificationStatus: newStatus,
        ...(action === 'reject' && {
          rejectionReason: reason,
          rejectionFeedback: feedback,
        }),
      },
    });
    
    // Update donor metrics if verified
    if (action === 'approve' && response.donorId) {
      await this.updateDonorMetrics(response.donorId);
    }
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: verifiedBy,
        action: action === 'approve' ? 'VERIFY_RESPONSE' : 'REJECT_RESPONSE',
        entityType: 'RapidResponse',
        entityId: responseId,
        beforeValue: { verificationStatus: response.verificationStatus },
        afterValue: {
          verificationStatus: newStatus,
          ...(action === 'reject' && { rejectionReason: reason, rejectionFeedback: feedback }),
        },
        timestamp: new Date(),
      },
    });
    
    return updated;
  }
  
  /**
   * Get verification queue
   */
  static async getVerificationQueue(
    type?: 'assessment' | 'response',
    page = 1,
    pageSize = 20
  ) {
    const skip = (page - 1) * pageSize;
    
    if (type === 'assessment' || !type) {
      const assessments = await prisma.rapidAssessment.findMany({
        where: {
          verificationStatus: VerificationStatus.PENDING,
        },
        include: {
          affectedEntity: true,
          assessor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize,
      });
      
      const totalCount = await prisma.rapidAssessment.count({
        where: { verificationStatus: VerificationStatus.PENDING },
      });
      
      if (type === 'assessment') {
        return {
          items: assessments,
          totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        };
      }
    }
    
    if (type === 'response' || !type) {
      const responses = await prisma.rapidResponse.findMany({
        where: {
          verificationStatus: VerificationStatus.PENDING,
          status: 'DELIVERED', // Only verify delivered responses
        },
        include: {
          affectedEntity: true,
          responder: {
            select: { id: true, name: true, email: true },
          },
          assessment: {
            select: { id: true, assessmentType: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize,
      });
      
      const totalCount = await prisma.rapidResponse.count({
        where: {
          verificationStatus: VerificationStatus.PENDING,
          status: 'DELIVERED',
        },
      });
      
      if (type === 'response') {
        return {
          items: responses,
          totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        };
      }
    }
    
    // Return combined if no type specified
    // Implementation depends on UI requirements
    return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
  
  /**
   * Update donor performance metrics
   */
  private static async updateDonorMetrics(donorId: string) {
    // Get all commitments
    const commitments = await prisma.donorCommitment.findMany({
      where: { donorId },
    });
    
    // Get all verified responses
    const verifiedResponses = await prisma.rapidResponse.findMany({
      where: {
        donorId,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });
    
    // Calculate metrics
    const totalCommitments = commitments.reduce(
      (sum, c) => sum + (c.items as any[]).reduce((s, i) => s + i.quantity, 0),
      0
    );
    
    const totalDelivered = commitments.reduce(
      (sum, c) => sum + c.deliveredQuantity,
      0
    );
    
    const verifiedDelivered = commitments.reduce(
      (sum, c) => sum + c.verifiedDeliveredQuantity,
      0
    );
    
    const selfReportedRate = totalCommitments > 0 
      ? (totalDelivered / totalCommitments) * 100 
      : 0;
    
    const verifiedRate = totalCommitments > 0 
      ? (verifiedDelivered / totalCommitments) * 100 
      : 0;
    
    // Update donor
    await prisma.donor.update({
      where: { id: donorId },
      data: {
        totalCommitments,
        totalDelivered,
        selfReportedDeliveryRate: selfReportedRate,
        verifiedDeliveryRate: verifiedRate,
      },
    });
    
    // Recalculate leaderboard ranks
    await this.updateLeaderboardRanks();
  }
  
  /**
   * Update leaderboard ranks for all donors
   */
  private static async updateLeaderboardRanks() {
    const donors = await prisma.donor.findMany({
      orderBy: [
        { verifiedDeliveryRate: 'desc' },
        { totalCommitments: 'desc' },
      ],
    });
    
    // Update ranks
    await Promise.all(
      donors.map((donor, index) =>
        prisma.donor.update({
          where: { id: donor.id },
          data: { leaderboardRank: index + 1 },
        })
      )
    );
  }
}
```

---
