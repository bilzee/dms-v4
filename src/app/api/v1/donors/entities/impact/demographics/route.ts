import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { userId, roles } = context;

    // Check if user has donor role
    if (!roles.includes('DONOR')) {
      return NextResponse.json(
        { success: false, error: 'Donor role required' },
        { status: 403 }
      );
    }

    // Get all entities that the donor has access to through EntityAssignment
    const entityAssignments = await prisma.entityAssignment.findMany({
      where: {
        userId: userId
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

    if (entityAssignments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalEntities: 0,
          aggregatedDemographics: {},
          entities: []
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: crypto.randomUUID()
        }
      });
    }

    // Aggregate demographics across all entities
    let totalPopulation = 0;
    let totalVulnerableCount = 0;
    let totalHouseholds = 0;
    let totalMale = 0;
    let totalFemale = 0;
    let totalChildrenUnder5 = 0;
    let totalElderly = 0;
    let totalDisability = 0;
    let totalAssessments = 0;
    let totalCommitments = 0;
    let totalActiveResponses = 0;

    const entitiesByType: Record<string, number> = {};
    const entitiesByState: Record<string, number> = {};
    const entitiesByLGA: Record<string, number> = {};

    // Get detailed entity data with latest activities
    const entitiesData = await Promise.all(
      entityAssignments.map(async (assignment) => {
        const entity = assignment.entity;
        const metadata = entity.metadata as any || {};
        const coordinates = entity.coordinates as any || {};

        // Count entities by type and location
        entitiesByType[entity.type] = (entitiesByType[entity.type] || 0) + 1;
        if (metadata.state) {
          entitiesByState[metadata.state] = (entitiesByState[metadata.state] || 0) + 1;
        }
        if (metadata.lga) {
          entitiesByLGA[metadata.lga] = (entitiesByLGA[metadata.lga] || 0) + 1;
        }

        // Aggregate numerical values
        const population = metadata.population || metadata.totalPopulation || 0;
        const vulnerableCount = metadata.vulnerableCount || metadata.vulnerablePopulation || 0;
        const households = metadata.householdCount || metadata.totalHouseholds || 0;
        const malePopulation = metadata.malePopulation || metadata.populationMale || 0;
        const femalePopulation = metadata.femalePopulation || metadata.populationFemale || 0;
        const childrenUnder5 = metadata.childrenUnder5 || metadata.populationUnder5 || 0;
        const elderlyCount = metadata.elderlyCount || metadata.elderlyPersons || 0;
        const disabilityCount = metadata.disabilityCount || metadata.personWithDisability || 0;

        totalPopulation += population;
        totalVulnerableCount += vulnerableCount;
        totalHouseholds += households;
        totalMale += malePopulation;
        totalFemale += femalePopulation;
        totalChildrenUnder5 += childrenUnder5;
        totalElderly += elderlyCount;
        totalDisability += disabilityCount;
        totalAssessments += entity._count.rapidAssessments;
        totalCommitments += entity._count.commitments;

        // Get latest assessment and active responses for this entity
        const [latestAssessment, activeResponses] = await Promise.all([
          prisma.rapidAssessment.findFirst({
            where: {
              entityId: entity.id,
              verificationStatus: 'VERIFIED'
            },
            orderBy: { rapidAssessmentDate: 'desc' },
            select: {
              id: true,
              rapidAssessmentDate: true,
              rapidAssessmentType: true
            }
          }),
          prisma.rapidResponse.count({
            where: {
              entityId: entity.id,
              status: 'PLANNED'
            }
          })
        ]);

        totalActiveResponses += activeResponses;

        return {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          location: entity.location,
          coordinates: (coordinates.lat && coordinates.lng) ? {
            lat: coordinates.lat,
            lng: coordinates.lng
          } : null,
          demographics: {
            population,
            vulnerableCount,
            households,
            malePopulation,
            femalePopulation,
            childrenUnder5,
            elderlyCount,
            disabilityCount,
            state: metadata.state || null,
            lga: metadata.lga || null,
            ward: metadata.ward || null
          },
          stats: {
            verifiedAssessments: entity._count.rapidAssessments,
            totalCommitments: entity._count.commitments,
            activeResponses: activeResponses
          },
          latestActivity: {
            lastAssessment: latestAssessment?.rapidAssessmentDate || null,
            lastAssessmentType: latestAssessment?.rapidAssessmentType || null,
            assignmentDate: assignment.assignedAt
          },
          isActive: entity.isActive
        };
      })
    );

    // Calculate percentages and ratios
    const vulnerabilityRate = totalPopulation > 0 ? (totalVulnerableCount / totalPopulation) * 100 : 0;
    const assessmentCoverage = entityAssignments.length > 0 ? (entitiesData.filter(e => e.stats.verifiedAssessments > 0).length / entityAssignments.length) * 100 : 0;
    const activeEntities = entitiesData.filter(e => e.isActive).length;

    const responseData = {
      totalEntities: entityAssignments.length,
      activeEntities,
      aggregatedDemographics: {
        totalPopulation,
        totalVulnerableCount,
        totalHouseholds,
        totalMale,
        totalFemale,
        totalChildrenUnder5,
        totalElderly,
        totalDisability,
        vulnerabilityRate: Math.round(vulnerabilityRate * 100) / 100,
        averageHouseholdSize: totalHouseholds > 0 ? Math.round((totalPopulation / totalHouseholds) * 100) / 100 : 0
      },
      distribution: {
        byType: entitiesByType,
        byState: entitiesByState,
        byLGA: entitiesByLGA
      },
      overallStats: {
        totalVerifiedAssessments: totalAssessments,
        totalCommitments: totalCommitments,
        totalActiveResponses: totalActiveResponses,
        assessmentCoverage: Math.round(assessmentCoverage * 100) / 100
      },
      entities: entitiesData
    };

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
    console.error('Donor entities impact demographics API error:', error);
    return handleApiError(error);
  }
});