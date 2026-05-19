import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { db } from '@/lib/db/client';
import { auditLog } from '@/lib/services/audit.service';

export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    // Authorization check - COORDINATOR role required
    const hasPermission = context.roles.some(role => 
      role === 'COORDINATOR' || role === 'ADMIN'
    );

    if (!hasPermission) {
      await auditLog({
        userId: context.userId,
        action: 'UNAUTHORIZED_ACCESS',
        resource: 'DONOR_RECOMMENDATIONS',
        resourceId: params.id,
        oldValues: null,
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });
      
      return NextResponse.json(
        { success: false, error: 'Forbidden - Coordinator access required' },
        { status: 403 }
      );
    }

    const entityId = params.id;

    // Verify entity exists
    const entity = await db.entity.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        name: true,
        type: true,
        location: true
      }
    });

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      );
    }

    // Get the latest verified assessment for the entity to identify gaps
    const latestAssessment = await db.rapidAssessment.findFirst({
      where: {
        entityId: entityId,
        verificationStatus: 'VERIFIED'
      },
      select: {
        id: true,
        rapidAssessmentType: true,
        healthAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true,
        populationAssessment: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!latestAssessment) {
      return NextResponse.json({
        success: true,
        data: {
          data: [],
          message: 'No verified assessments found for this entity'
        }
      });
    }

    // Generate mock donor recommendations based on assessment type
    const mockRecommendations = [
      {
        id: 'rec_1',
        donorName: 'UNICEF',
        resourceType: 'HEALTH_SUPPLIES',
        priority: 'HIGH',
        estimatedAmount: 50000,
        expertise: ['Medical Supplies', 'Emergency Response'],
        previousContributions: 15,
        responseTime: '24-48 hours',
        matchScore: 95
      },
      {
        id: 'rec_2', 
        donorName: 'World Food Programme',
        resourceType: 'FOOD_SUPPLIES',
        priority: 'CRITICAL',
        estimatedAmount: 75000,
        expertise: ['Food Distribution', 'Nutrition Programs'],
        previousContributions: 22,
        responseTime: '12-24 hours',
        matchScore: 88
      }
    ];

    // Return mock recommendations for now
    return NextResponse.json({
      success: true,
      data: {
        entityId,
        recommendations: mockRecommendations,
        assessmentType: latestAssessment.rapidAssessmentType,
        totalRecommendations: mockRecommendations.length
      }
    });

  } catch (error) {
    console.error('Error fetching donor recommendations:', error);
    
    // Log error
    try {
      await auditLog({
        userId: context.userId,
        action: 'ERROR_ACCESS_DONOR_RECOMMENDATIONS',
        resource: 'DONOR_RECOMMENDATIONS',
        resourceId: params.id,
        oldValues: null,
        newValues: { error: error instanceof Error ? error.message : 'Unknown error' },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });
    } catch (auditError) {
      // Ignore audit log errors
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
})
