/**
 * Assessment Relationship Service
 * 
 * Provides service functions for querying entity-incident relationships
 * through existing RapidAssessment data. This service leverages the
 * assessment records as the foundation for relationship visualization
 * and statistics calculation.
 */

import { db } from '@/lib/db/client';
import type {
  EntityIncidentRelationship,
  EntityWithRelationships,
  IncidentWithRelationships,
  AssessmentTimelineItem,
  RelationshipQueryParams,
  RelationshipStatistics
} from '@/types/assessment-relationships';
import type { Priority, AssessmentType, VerificationStatus } from '@prisma/client';

/**
 * Get all entities related to a specific incident through assessments
 */
export async function getIncidentEntities(
  incidentId: string, 
  params?: RelationshipQueryParams
): Promise<EntityWithRelationships[]> {
  const whereClause: any = {
    incidentId,
    ...(params?.priorityFilter?.length && { priority: { in: params.priorityFilter } }),
    ...(params?.assessmentTypeFilter?.length && { rapidAssessmentType: { in: params.assessmentTypeFilter } }),
    ...(params?.verificationStatusFilter?.length && { verificationStatus: { in: params.verificationStatusFilter } }),
    ...(params?.startDate && { rapidAssessmentDate: { gte: params.startDate } }),
    ...(params?.endDate && { rapidAssessmentDate: { lte: params.endDate } }),
  };

  // Get unique entities with their assessments for this incident
  const assessments = await db.rapidAssessment.findMany({
    where: whereClause,
    include: {
      entity: true,
      incident: true,
    },
    orderBy: {
      rapidAssessmentDate: 'desc',
    },
    ...(params?.limit && { take: params.limit }),
    ...(params?.offset && { skip: params.offset }),
  });

  // Group assessments by entity and calculate statistics
  const entitiesMap = new Map<string, EntityWithRelationships>();

  for (const assessment of assessments) {
    const entityId = assessment.entityId;
    
    if (!entitiesMap.has(entityId)) {
      entitiesMap.set(entityId, {
        ...assessment.entity,
        assessmentCount: 0,
        incidentCount: 1, // This incident
        priorityDistribution: {
          CRITICAL: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
          UNCLASSIFIED: 0,
        },
      });
    }

    const entityData = entitiesMap.get(entityId)!;
    entityData.assessmentCount!++;
    entityData.priorityDistribution![assessment.priority]++;
  }

  return Array.from(entitiesMap.values());
}

/**
 * Get all incidents affecting a specific entity through assessments
 */
export async function getEntityIncidents(
  entityId: string, 
  params?: RelationshipQueryParams
): Promise<IncidentWithRelationships[]> {
  const whereClause: any = {
    entityId,
    ...(params?.priorityFilter?.length && { priority: { in: params.priorityFilter } }),
    ...(params?.assessmentTypeFilter?.length && { rapidAssessmentType: { in: params.assessmentTypeFilter } }),
    ...(params?.verificationStatusFilter?.length && { verificationStatus: { in: params.verificationStatusFilter } }),
    ...(params?.startDate && { rapidAssessmentDate: { gte: params.startDate } }),
    ...(params?.endDate && { rapidAssessmentDate: { lte: params.endDate } }),
  };

  // Get assessments for this entity across all incidents
  const assessments = await db.rapidAssessment.findMany({
    where: whereClause,
    include: {
      entity: true,
      incident: true,
    },
    orderBy: {
      rapidAssessmentDate: 'desc',
    },
    ...(params?.limit && { take: params.limit }),
    ...(params?.offset && { skip: params.offset }),
  });

  // Group assessments by incident and calculate statistics
  const incidentsMap = new Map<string, IncidentWithRelationships>();

  for (const assessment of assessments) {
    const incidentId = assessment.incidentId;
    
    if (!incidentsMap.has(incidentId)) {
      incidentsMap.set(incidentId, {
        ...assessment.incident,
        assessmentCount: 0,
        entityCount: 1, // This entity
        priorityDistribution: {
          CRITICAL: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
          UNCLASSIFIED: 0,
        },
      });
    }

    const incidentData = incidentsMap.get(incidentId)!;
    incidentData.assessmentCount!++;
    incidentData.priorityDistribution![assessment.priority]++;
  }

  return Array.from(incidentsMap.values());
}

/**
 * Get comprehensive relationship data between entities and incidents
 */
export async function getEntityIncidentRelationships(
  params?: RelationshipQueryParams
): Promise<EntityIncidentRelationship[]> {
  const whereClause: any = {
    ...(params?.incidentId && { incidentId: params.incidentId }),
    ...(params?.entityId && { entityId: params.entityId }),
    ...(params?.priorityFilter?.length && { priority: { in: params.priorityFilter } }),
    ...(params?.assessmentTypeFilter?.length && { rapidAssessmentType: { in: params.assessmentTypeFilter } }),
    ...(params?.verificationStatusFilter?.length && { verificationStatus: { in: params.verificationStatusFilter } }),
    ...(params?.startDate && { rapidAssessmentDate: { gte: params.startDate } }),
    ...(params?.endDate && { rapidAssessmentDate: { lte: params.endDate } }),
  };

  const assessments = await db.rapidAssessment.findMany({
    where: whereClause,
    include: {
      entity: true,
      incident: true,
    },
    orderBy: {
      rapidAssessmentDate: 'desc',
    },
    ...(params?.limit && { take: params.limit }),
    ...(params?.offset && { skip: params.offset }),
  });

  // Group assessments by entity-incident pairs
  const relationshipsMap = new Map<string, EntityIncidentRelationship>();

  for (const assessment of assessments) {
    const relationshipKey = `${assessment.entityId}-${assessment.incidentId}`;
    
    if (!relationshipsMap.has(relationshipKey)) {
      relationshipsMap.set(relationshipKey, {
        entityId: assessment.entityId,
        incidentId: assessment.incidentId,
        entity: assessment.entity,
        incident: assessment.incident,
        assessments: [],
        priorityDistribution: {
          CRITICAL: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
          UNCLASSIFIED: 0,
        },
        latestAssessment: assessment,
        totalAssessments: 0,
        firstAssessmentDate: assessment.rapidAssessmentDate,
        lastAssessmentDate: assessment.rapidAssessmentDate,
      });
    }

    const relationship = relationshipsMap.get(relationshipKey)!;
    relationship.assessments.push(assessment);
    relationship.totalAssessments++;
    relationship.priorityDistribution[assessment.priority]++;
    
    // Update timeline bounds
    if (assessment.rapidAssessmentDate > relationship.lastAssessmentDate) {
      relationship.lastAssessmentDate = assessment.rapidAssessmentDate;
      relationship.latestAssessment = assessment;
    }
    if (assessment.rapidAssessmentDate < relationship.firstAssessmentDate) {
      relationship.firstAssessmentDate = assessment.rapidAssessmentDate;
    }
  }

  return Array.from(relationshipsMap.values());
}

/**
 * Get assessment timeline for relationship visualization
 */
export async function getAssessmentTimeline(
  params?: RelationshipQueryParams
): Promise<AssessmentTimelineItem[]> {
  const whereClause: any = {
    ...(params?.incidentId && { incidentId: params.incidentId }),
    ...(params?.entityId && { entityId: params.entityId }),
    ...(params?.priorityFilter?.length && { priority: { in: params.priorityFilter } }),
    ...(params?.assessmentTypeFilter?.length && { rapidAssessmentType: { in: params.assessmentTypeFilter } }),
    ...(params?.verificationStatusFilter?.length && { verificationStatus: { in: params.verificationStatusFilter } }),
    ...(params?.startDate && { rapidAssessmentDate: { gte: params.startDate } }),
    ...(params?.endDate && { rapidAssessmentDate: { lte: params.endDate } }),
  };

  const assessments = await db.rapidAssessment.findMany({
    where: whereClause,
    include: {
      entity: true,
      incident: true,
    },
    orderBy: {
      rapidAssessmentDate: 'desc',
    },
    ...(params?.limit && { take: params.limit }),
    ...(params?.offset && { skip: params.offset }),
  });

  return assessments.map(assessment => ({
    assessment,
    entity: assessment.entity,
    incident: assessment.incident,
  }));
}

/**
 * Calculate comprehensive relationship statistics
 */
export async function calculateRelationshipStatistics(
  params?: RelationshipQueryParams
): Promise<RelationshipStatistics> {
  const whereClause: any = {
    ...(params?.incidentId && { incidentId: params.incidentId }),
    ...(params?.entityId && { entityId: params.entityId }),
    ...(params?.startDate && { rapidAssessmentDate: { gte: params.startDate } }),
    ...(params?.endDate && { rapidAssessmentDate: { lte: params.endDate } }),
  };

  // Get assessment counts grouped by various fields
  const [
    totalAssessments,
    uniqueEntities,
    uniqueIncidents,
    priorityStats,
    typeStats,
    statusStats,
  ] = await Promise.all([
    db.rapidAssessment.count({ where: whereClause }),
    db.rapidAssessment.findMany({
      where: whereClause,
      select: { entityId: true },
      distinct: ['entityId'],
    }),
    db.rapidAssessment.findMany({
      where: whereClause,
      select: { incidentId: true },
      distinct: ['incidentId'],
    }),
    db.rapidAssessment.groupBy({
      by: ['priority'],
      where: whereClause,
      _count: true,
    }),
    db.rapidAssessment.groupBy({
      by: ['rapidAssessmentType'],
      where: whereClause,
      _count: true,
    }),
    db.rapidAssessment.groupBy({
      by: ['verificationStatus'],
      where: whereClause,
      _count: true,
    }),
  ]);

  // Initialize distributions
  const priorityDistribution: RelationshipStatistics['priorityDistribution'] = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    UNCLASSIFIED: 0,
  };

  const assessmentTypeDistribution: RelationshipStatistics['assessmentTypeDistribution'] = {
    HEALTH: 0,
    WASH: 0,
    SHELTER: 0,
    FOOD: 0,
    SECURITY: 0,
    POPULATION: 0,
  };

  const verificationStatusDistribution: RelationshipStatistics['verificationStatusDistribution'] = {
    DRAFT: 0,
    SUBMITTED: 0,
    VERIFIED: 0,
    AUTO_VERIFIED: 0,
    REJECTED: 0,
  };

  // Populate distributions
  priorityStats.forEach(stat => {
    priorityDistribution[stat.priority as Priority] = stat._count;
  });

  typeStats.forEach(stat => {
    assessmentTypeDistribution[stat.rapidAssessmentType as AssessmentType] = stat._count;
  });

  statusStats.forEach(stat => {
    verificationStatusDistribution[stat.verificationStatus as VerificationStatus] = stat._count;
  });

  return {
    totalEntities: uniqueEntities.length,
    totalIncidents: uniqueIncidents.length,
    totalAssessments,
    priorityDistribution,
    assessmentTypeDistribution,
    verificationStatusDistribution,
  };
}

/**
 * Get summary aggregation for incident dashboard
 */
export async function getIncidentAssessmentSummary(incidentId: string) {
  const assessments = await db.rapidAssessment.findMany({
    where: { incidentId },
    include: {
      entity: true,
    },
  });

  const entityMap = new Map();
  const priorityDistribution = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    UNCLASSIFIED: 0,
  } as Record<Priority, number>;

  for (const assessment of assessments) {
    entityMap.set(assessment.entityId, assessment.entity);
    priorityDistribution[assessment.priority]++;
  }

  return {
    totalAssessments: assessments.length,
    uniqueEntities: entityMap.size,
    entities: Array.from(entityMap.values()),
    priorityDistribution,
    latestAssessment: assessments[0] || null,
  };
}