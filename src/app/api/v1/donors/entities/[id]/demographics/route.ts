import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import {
  EntityDemographicsSchema
} from '@/lib/validation/entity-insights';
import { handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest, context, nextContext) => {
  try {
    const { userId, roles } = context;
    // Extract params from nextContext in Next.js 14.2.5
    const entityId = nextContext?.params?.id;

    // Check if user has donor role
    if (!roles.includes('DONOR')) {
      return NextResponse.json(
        { success: false, error: 'Donor role required' },
        { status: 403 }
      );
    }

    // Validate entity ID format
    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid entity ID is required' },
        { status: 400 }
      );
    }

    // Verify donor has access to this entity through EntityAssignment
    const entityAssignment = await prisma.entityAssignment.findFirst({
      where: {
        userId: userId,
        entityId: entityId
      },
      include: {
        entity: {
          include: {
            _count: {
              select: {
                rapidAssessments: {
                  where: { verificationStatus: 'VERIFIED' }
                },
                commitments: true,
                responses: true
              }
            }
          }
        }
      }
    });

    if (!entityAssignment) {
      return NextResponse.json(
        { success: false, error: 'Entity not found or access denied' },
        { status: 404 }
      );
    }

    const entity = entityAssignment.entity;

    // Parse demographic information from entity metadata
    const metadata = entity.metadata as any || {};
    const coordinates = entity.coordinates as any || {};

    // Extract demographic information safely from metadata
    const demographics = {
      population: metadata.population || metadata.totalPopulation || null,
      vulnerableCount: metadata.vulnerableCount || metadata.vulnerablePopulation || null,
      lga: metadata.lga || null,
      ward: metadata.ward || null,
      state: metadata.state || null,
      location: entity.location || null,
      coordinates: (coordinates.lat && coordinates.lng) ? {
        lat: coordinates.lat,
        lng: coordinates.lng
      } : null,
      
      // Entity-type specific demographics
      campDetails: entity.type === 'CAMP' ? {
        capacity: metadata.capacity || null,
        currentOccupancy: metadata.currentOccupancy || null,
        campType: metadata.campType || null,
        amenities: metadata.amenities || {}
      } : null,
      
      communityDetails: entity.type === 'COMMUNITY' ? {
        dominantOccupation: metadata.dominantOccupation || null,
        mainWaterSource: metadata.mainWaterSource || null,
        electricityAccess: metadata.electricityAccess || null,
        schoolCount: metadata.schoolCount || null,
        healthCenterCount: metadata.healthCenterCount || null
      } : null,
      
      facilityDetails: entity.type === 'FACILITY' ? {
        facilityType: metadata.facilityType || null,
        capacity: metadata.capacity || null,
        services: metadata.services || [],
        operatingHours: metadata.operatingHours || null
      } : null,
      
      // Common demographic fields
      householdCount: metadata.householdCount || metadata.totalHouseholds || null,
      malePopulation: metadata.malePopulation || metadata.populationMale || null,
      femalePopulation: metadata.femalePopulation || metadata.populationFemale || null,
      childrenUnder5: metadata.childrenUnder5 || metadata.populationUnder5 || null,
      elderlyCount: metadata.elderlyCount || metadata.elderlyPersons || null,
      disabilityCount: metadata.disabilityCount || metadata.personWithDisability || null
    };

    // Get additional entity statistics
    const [latestAssessment, totalCommitments, activeResponses] = await Promise.all([
      prisma.rapidAssessment.findFirst({
        where: {
          entityId: entityId,
          verificationStatus: 'VERIFIED'
        },
        orderBy: { rapidAssessmentDate: 'desc' },
        select: {
          id: true,
          rapidAssessmentDate: true,
          rapidAssessmentType: true
        }
      }),
      prisma.donorCommitment.count({
        where: {
          entityId: entityId,
          status: { in: ['PLANNED', 'PARTIAL'] }
        }
      }),
      prisma.rapidResponse.count({
        where: {
          entityId: entityId,
          status: 'PLANNED'
        }
      })
    ]);

    const responseData = {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      location: entity.location,
      coordinates: demographics.coordinates,
      demographics: demographics,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      
      // Additional helpful information
      stats: {
        verifiedAssessments: entity._count.rapidAssessments,
        totalCommitments: entity._count.commitments,
        activeResponses: activeResponses,
        pendingCommitments: totalCommitments
      },
      
      latestActivity: {
        lastAssessment: latestAssessment?.rapidAssessmentDate || null,
        lastAssessmentType: latestAssessment?.rapidAssessmentType || null,
        assignmentDate: entityAssignment.assignedAt
      }
    };

    // Validate response against schema (extend with additional fields)
    const baseValidation = EntityDemographicsSchema.safeParse(responseData);
    if (!baseValidation.success) {
      console.error('Response validation error:', baseValidation.error);
      // Continue with response even if validation fails, but log the error
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Entity demographics API error:', error);
    return handleApiError(error);
  }
});