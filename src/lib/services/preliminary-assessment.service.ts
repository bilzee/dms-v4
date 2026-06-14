import { prisma } from '@/lib/db/client'
import { PreliminaryAssessment, Incident, Prisma } from '@prisma/client'
import { 
  PreliminaryAssessmentInput, 
  CreatePreliminaryAssessmentInput,
  UpdatePreliminaryAssessmentInput,
  QueryPreliminaryAssessmentInput 
} from '@/lib/validation/preliminary-assessment'

// Type for preliminary assessment with relations
interface PreliminaryAssessmentWithRelations extends PreliminaryAssessment {
  incident?: Incident | null;
  affectedEntities?: Array<{
    id: string;
    preliminaryAssessmentId: string;
    entityId: string;
    entity: {
      id: string;
      name: string;
      type: string;
      location: string | null;
      coordinates: unknown;
      metadata: unknown;
      isActive: boolean;
      autoApproveEnabled: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
  }>;
}

export class PreliminaryAssessmentService {
  static async create(
    input: CreatePreliminaryAssessmentInput,
    createdBy: string
  ): Promise<PreliminaryAssessment & { incident?: Incident }> {
    const { data, createIncident, incidentData } = input
    const { affectedEntityIds, estimatedAgriculturalLandsAffected, ...assessmentData } = data

    let incident: Incident | undefined

    // Create incident if requested
    if (createIncident && incidentData) {
      incident = await prisma.incident.create({
        data: {
          name: incidentData.description,
          type: incidentData.type,
          subType: incidentData.subType,
          description: incidentData.description,
          location: incidentData.location,
          coordinates: {
            lat: data.reportingLatitude,
            lng: data.reportingLongitude
          },
          createdBy
        }
      })
    }

    // Create preliminary assessment with entity relationships
    const assessment = await prisma.preliminaryAssessment.create({
      data: {
        ...assessmentData,
        estimatedAgriculturalLandsAffected: estimatedAgriculturalLandsAffected != null ? String(estimatedAgriculturalLandsAffected) : null,
        incidentId: incident?.id || data.incidentId || null,
        affectedEntities: affectedEntityIds && affectedEntityIds.length > 0 ? {
          create: affectedEntityIds.map((entityId: string) => ({
            entityId
          }))
        } : undefined
      },
      include: {
        incident: true,
        affectedEntities: {
          include: {
            entity: true
          }
        }
      }
    })

    const incidentId = assessment.incidentId || incident?.id
    if (incidentId) {
      try {
        const { incidentSeverityService } = await import('@/lib/services/incident-severity.service');
        await incidentSeverityService.recalculateIncidentSeverity(incidentId)
      } catch {}
    }

    return assessment as unknown as PreliminaryAssessment & { incident?: Incident }
  }

  static async findById(id: string): Promise<(PreliminaryAssessment & { incident?: Incident }) | null> {
    return await prisma.preliminaryAssessment.findUnique({
      where: { id },
      include: {
        incident: true,
        affectedEntities: {
          include: {
            entity: true
          }
        }
      }
    }) as unknown as (PreliminaryAssessment & { incident?: Incident }) | null
  }

  static async findByUserId(
    userId: string,
    query: QueryPreliminaryAssessmentInput
  ): Promise<{
    assessments: (PreliminaryAssessment & { incident?: Incident })[]
    total: number
    totalPages: number
  }> {
    const { page, limit, incidentId, lga, ward } = query

    const where: Prisma.PreliminaryAssessmentWhereInput = {}

    // Add filters
    if (incidentId) {
      where.incidentId = incidentId
    }

    if (lga) {
      where.reportingLGA = lga
    }

    if (ward) {
      where.reportingWard = ward
    }

    // Get total count
    const total = await prisma.preliminaryAssessment.count({ where })
    const totalPages = Math.ceil(total / limit)

    // Get assessments with pagination
    const assessments = await prisma.preliminaryAssessment.findMany({
      where,
      include: {
        incident: true,
        affectedEntities: {
          include: {
            entity: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    return {
      assessments: assessments as unknown as (PreliminaryAssessment & { incident?: Incident })[],
      total,
      totalPages
    }
  }

  static async findAll(
    query: QueryPreliminaryAssessmentInput
  ): Promise<{
    assessments: (PreliminaryAssessment & { incident?: Incident })[]
    total: number
    totalPages: number
  }> {
    const { page, limit, userId, incidentId, lga, ward } = query

    const where: Prisma.PreliminaryAssessmentWhereInput = {}

    // Add filters
    if (userId) {
      // Note: PreliminaryAssessment doesn't have userId, so we can't filter by it directly
      // This would need to be handled differently if we need user-based filtering
    }

    if (incidentId) {
      where.incidentId = incidentId
    }

    if (lga) {
      where.reportingLGA = lga
    }

    if (ward) {
      where.reportingWard = ward
    }

    // Get total count
    const total = await prisma.preliminaryAssessment.count({ where })
    const totalPages = Math.ceil(total / limit)

    // Get assessments with pagination
    const assessments = await prisma.preliminaryAssessment.findMany({
      where,
      include: {
        incident: true,
        affectedEntities: {
          include: {
            entity: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    return {
      assessments: assessments as unknown as (PreliminaryAssessment & { incident?: Incident })[],
      total,
      totalPages
    }
  }

  static async update(
    id: string,
    input: UpdatePreliminaryAssessmentInput
  ): Promise<PreliminaryAssessment & { incident?: Incident }> {
    const { affectedEntityIds, estimatedAgriculturalLandsAffected, ...updateData } = input.data

    if (estimatedAgriculturalLandsAffected !== undefined) {
      (updateData as any).estimatedAgriculturalLandsAffected = estimatedAgriculturalLandsAffected != null ? String(estimatedAgriculturalLandsAffected) : null
    }

    // Remove incidentId from updateData if null (Prisma update doesn't accept null for relation)
    if (updateData.incidentId === null) {
      delete (updateData as any).incidentId
    }

    // Handle entity relationships separately if provided
    if (affectedEntityIds !== undefined) {
      // First, remove existing relationships
      await prisma.preliminaryAssessmentEntity.deleteMany({
        where: { preliminaryAssessmentId: id }
      })
      
      // Then create new relationships
      if (affectedEntityIds.length > 0) {
        await prisma.preliminaryAssessmentEntity.createMany({
          data: affectedEntityIds.map((entityId: string) => ({
            preliminaryAssessmentId: id,
            entityId
          }))
        })
      }
    }

    const assessment = await prisma.preliminaryAssessment.update({
      where: { id },
      data: updateData,
      include: {
        incident: true,
        affectedEntities: {
          include: {
            entity: true
          }
        }
      }
    })

    const result = assessment as unknown as PreliminaryAssessment & { incident?: Incident }

    if (result.incidentId) {
      try {
        const { incidentSeverityService } = await import('@/lib/services/incident-severity.service');
        await incidentSeverityService.recalculateIncidentSeverity(result.incidentId)
      } catch {}
    }

    return result
  }

  static async delete(id: string): Promise<void> {
    const assessment = await prisma.preliminaryAssessment.findUnique({
      where: { id },
      select: { incidentId: true }
    })
    await prisma.preliminaryAssessment.delete({
      where: { id }
    })
    if (assessment?.incidentId) {
      try {
        const { incidentSeverityService } = await import('@/lib/services/incident-severity.service');
        await incidentSeverityService.recalculateIncidentSeverity(assessment.incidentId)
      } catch {}
    }
  }

  static async linkToIncident(assessmentId: string, incidentId: string): Promise<PreliminaryAssessment> {
    return await prisma.preliminaryAssessment.update({
      where: { id: assessmentId },
      data: { incidentId }
    })
  }
}