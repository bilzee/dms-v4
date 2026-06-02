import { prisma } from '@/lib/db/client'
import { RapidAssessment, AssessmentType, Prisma, Priority } from '@prisma/client'
import { 
  CreateRapidAssessmentInput,
  UpdateRapidAssessmentInput,
  QueryRapidAssessmentInput,
  HealthAssessmentInput,
  PopulationAssessmentInput,
  FoodAssessmentInput,
  WASHAssessmentInput,
  ShelterAssessmentInput,
  SecurityAssessmentInput
} from '@/lib/validation/rapid-assessment'
import { 
  analyzeHealthGaps, 
  analyzeFoodGaps, 
  analyzeWASHGaps, 
  analyzeShelterGaps, 
  analyzeSecurityGaps,
  HealthGapAnalysis,
  FoodGapAnalysis,
  WASHGapAnalysis,
  ShelterGapAnalysis,
  SecurityGapAnalysis
} from '@/lib/services/gap-analysis.service'

// Type for returned assessments with their specific data
export interface HealthAssessmentData {
  id: string;
  rapidAssessmentId: string;
  hasFunctionalClinic: boolean;
  hasEmergencyServices: boolean;
  numberHealthFacilities: number;
  healthFacilityType: string;
  qualifiedHealthWorkers: number;
  hasTrainedStaff: boolean;
  hasMedicineSupply: boolean;
  hasMedicalSupplies: boolean;
  hasMaternalChildServices: boolean;
  commonHealthIssues: string;
  additionalHealthDetails?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface PopulationAssessmentData {
  id: string;
  rapidAssessmentId: string;
  totalHouseholds: number;
  totalPopulation: number;
  populationMale: number;
  populationFemale: number;
  populationUnder5: number;
  pregnantWomen: number;
  lactatingMothers: number;
  personWithDisability: number;
  elderlyPersons: number;
  separatedChildren: number;
  numberLivesLost: number;
  numberInjured: number;
  additionalPopulationDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodAssessmentData {
  id: string;
  rapidAssessmentId: string;
  isFoodSufficient: boolean;
  hasRegularMealAccess: boolean;
  hasInfantNutrition: boolean;
  foodSource: string;
  availableFoodDurationDays: number;
  additionalFoodRequiredPersons: number;
  additionalFoodRequiredHouseholds: number;
  additionalFoodDetails?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface WASHAssessmentData {
  id: string;
  rapidAssessmentId: string;
  waterSource: string;
  isWaterSufficient: boolean;
  hasCleanWaterAccess: boolean;
  functionalLatrinesAvailable: number;
  areLatrinesSufficient: boolean;
  hasHandwashingFacilities: boolean;
  hasOpenDefecationConcerns: boolean;
  additionalWashDetails?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShelterAssessmentData {
  id: string;
  rapidAssessmentId: string;
  areSheltersSufficient: boolean;
  hasSafeStructures: boolean;
  shelterTypes: string;
  requiredShelterType: string;
  numberSheltersRequired: number;
  areOvercrowded: boolean;
  provideWeatherProtection: boolean;
  additionalShelterDetails?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityAssessmentData {
  id: string;
  rapidAssessmentId: string;
  isSafeFromViolence: boolean;
  gbvCasesReported: boolean;
  hasSecurityPresence: boolean;
  hasProtectionReportingMechanism: boolean;
  vulnerableGroupsHaveAccess: boolean;
  hasLighting: boolean;
  additionalSecurityDetails?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export type RapidAssessmentWithData = RapidAssessment & {
  healthAssessment?: HealthAssessmentData | null
  populationAssessment?: PopulationAssessmentData | null
  foodAssessment?: FoodAssessmentData | null
  wASHAssessment?: WASHAssessmentData | null
  shelterAssessment?: ShelterAssessmentData | null
  securityAssessment?: SecurityAssessmentData | null
}

export class RapidAssessmentService {
  static async create(
    input: CreateRapidAssessmentInput,
    createdBy: string
  ): Promise<RapidAssessmentWithData> {
    const { type, entityId, ...baseData } = input

    // Verify user is assigned to this entity
    await this.validateEntityAssignment(createdBy, entityId)

    // Check if entity has auto-approval enabled
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { autoApproveEnabled: true }
    })

    if (!entity) {
      throw new Error('Entity not found')
    }

    // Determine verification status based on entity's auto-approval setting
    const verificationStatus = entity.autoApproveEnabled ? 'AUTO_VERIFIED' : 'SUBMITTED'

    // Start transaction to create both rapid assessment and type-specific assessment
    const result = await prisma.$transaction(async (tx) => {
      // Create base rapid assessment
      const rapidAssessment = await tx.rapidAssessment.create({
        data: {
          rapidAssessmentType: type,
          rapidAssessmentDate: input.rapidAssessmentDate,
          assessorId: createdBy,
          assessorName: input.assessorName,
          entityId: input.entityId,
          incidentId: input.incidentId,
          location: input.location,
          coordinates: input.coordinates,
          priority: input.priority,
          mediaAttachments: input.mediaAttachments || [],
          versionNumber: 1,
          isOfflineCreated: false,
          syncStatus: 'SYNCED',
          verificationStatus,
          verifiedAt: entity.autoApproveEnabled ? new Date() : null
        }
      })

      // Create type-specific assessment based on type
      let typeSpecificAssessment = null
      switch (type) {
        case 'HEALTH':
          const healthData = (input as CreateRapidAssessmentInput & { healthData: HealthAssessmentInput }).healthData
          typeSpecificAssessment = await tx.healthAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...healthData,
              commonHealthIssues: JSON.stringify(healthData.commonHealthIssues || [])
            }
          })
          break

        case 'POPULATION':
          const populationData = (input as CreateRapidAssessmentInput & { populationData: PopulationAssessmentInput }).populationData
          typeSpecificAssessment = await tx.populationAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...populationData
            }
          })
          break

        case 'FOOD':
          const foodData = (input as CreateRapidAssessmentInput & { foodData: FoodAssessmentInput }).foodData
          typeSpecificAssessment = await tx.foodAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...foodData,
              foodSource: JSON.stringify(foodData.foodSource || [])
            }
          })
          break

        case 'WASH':
          const washData = (input as CreateRapidAssessmentInput & { washData: WASHAssessmentInput }).washData
          if (!washData) {
            throw new Error('WASH assessment data (washData) is required but missing from input')
          }
          typeSpecificAssessment = await tx.wASHAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...washData,
              waterSource: JSON.stringify(washData.waterSource || [])
            }
          })
          break

        case 'SHELTER':
          const shelterData = (input as CreateRapidAssessmentInput & { shelterData: ShelterAssessmentInput }).shelterData
          typeSpecificAssessment = await tx.shelterAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...shelterData,
              shelterTypes: JSON.stringify(shelterData.shelterTypes || []),
              requiredShelterType: JSON.stringify(shelterData.requiredShelterType || [])
            }
          })
          break

        case 'SECURITY':
          const securityData = (input as CreateRapidAssessmentInput & { securityData: SecurityAssessmentInput }).securityData
          typeSpecificAssessment = await tx.securityAssessment.create({
            data: {
              rapidAssessmentId: rapidAssessment.id,
              ...securityData
            }
          })
          break

        default:
          throw new Error(`Unsupported assessment type: ${type}`)
      }

      return { rapidAssessment, typeSpecificAssessment }
    })

    // Automatically trigger gap analysis calculation after successful creation
    await this.triggerGapAnalysis(result.rapidAssessment.id)

    // Recalculate incident severity bottom-up
    if (input.incidentId) {
      try {
        const { incidentSeverityService } = await import('@/lib/services/incident-severity.service');
        await incidentSeverityService.recalculateIncidentSeverity(input.incidentId)
      } catch {}
    }

    try {
      const { ActionSignalService } = await import('@/lib/services/action-signal.service');
      await ActionSignalService.evaluateAndGenerate({
        trigger: entity.autoApproveEnabled ? 'assessment-verified' : 'assessment-created',
        entityId: input.entityId,
        incidentId: input.incidentId,
        assessmentId: result.rapidAssessment.id,
        assessmentType: type,
        assessmentPriority: input.priority,
      });
    } catch (e) {
      console.error('[RapidAssessmentService] signal hook error:', e);
    }

    // Return the combined assessment
    return {
      ...result.rapidAssessment,
      [this.getTypeSpecificFieldName(result.rapidAssessment.rapidAssessmentType)]: result.typeSpecificAssessment
    }
  }

  static async findById(id: string): Promise<RapidAssessmentWithData | null> {
    const assessment = await prisma.rapidAssessment.findUnique({
      where: { id },
      include: {
        healthAssessment: true,
        populationAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true,
        assessor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true
          }
        },
        incident: {
          select: {
            id: true,
            type: true,
            subType: true,
            createdAt: true,
            severity: true
          }
        }
      }
    })

    return assessment as unknown as RapidAssessmentWithData
  }

  static async findByUserId(
    userId: string,
    query: QueryRapidAssessmentInput
  ): Promise<{
    assessments: RapidAssessmentWithData[]
    total: number
    totalPages: number
  }> {
    const { page, limit, entityId, type, verificationStatus, priority, startDate, endDate } = query
    const skip = (page - 1) * limit

    const where: Prisma.RapidAssessmentWhereInput = { assessorId: userId }

    if (entityId) where.entityId = entityId
    if (type) where.rapidAssessmentType = type
    if (verificationStatus) where.verificationStatus = verificationStatus
    if (priority) where.priority = priority
    if (startDate || endDate) {
      where.rapidAssessmentDate = {}
      if (startDate) where.rapidAssessmentDate.gte = startDate
      if (endDate) where.rapidAssessmentDate.lte = endDate
    }

    // Get total count
    const total = await prisma.rapidAssessment.count({ where })

    // Get assessments with pagination
    const assessments = await prisma.rapidAssessment.findMany({
      where,
      include: {
        healthAssessment: true,
        populationAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true,
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true
          }
        },
        incident: {
          select: {
            id: true,
            type: true,
            subType: true,
            createdAt: true,
            severity: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    return {
      assessments: assessments as unknown as RapidAssessmentWithData[],
      total,
      totalPages: Math.ceil(total / limit)
    }
  }

  static async findAll(
    query: QueryRapidAssessmentInput
  ): Promise<{
    assessments: RapidAssessmentWithData[]
    total: number
    totalPages: number
  }> {
    const { page, limit, userId, entityId, incidentId, type, verificationStatus, priority, startDate, endDate } = query
    const skip = (page - 1) * limit

    const where: Prisma.RapidAssessmentWhereInput = {}

    if (userId) where.assessorId = userId
    if (entityId) where.entityId = entityId
    if (incidentId) where.incidentId = incidentId
    if (type) where.rapidAssessmentType = type
    if (verificationStatus) where.verificationStatus = verificationStatus
    if (priority) where.priority = priority
    if (startDate || endDate) {
      where.rapidAssessmentDate = {}
      if (startDate) where.rapidAssessmentDate.gte = startDate
      if (endDate) where.rapidAssessmentDate.lte = endDate
    }

    // Get total count
    const total = await prisma.rapidAssessment.count({ where })

    // Get assessments with pagination
    const assessments = await prisma.rapidAssessment.findMany({
      where,
      include: {
        healthAssessment: true,
        populationAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true,
        assessor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true
          }
        },
        incident: {
          select: {
            id: true,
            type: true,
            subType: true,
            createdAt: true,
            severity: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    return {
      assessments: assessments as unknown as RapidAssessmentWithData[],
      total,
      totalPages: Math.ceil(total / limit)
    }
  }

  static async update(
    id: string,
    input: UpdateRapidAssessmentInput,
    updatedBy: string
  ): Promise<RapidAssessmentWithData> {
    // First check if assessment exists and user has permission
    const existingAssessment = await this.findById(id)
    if (!existingAssessment) {
      throw new Error('Assessment not found')
    }

    if (existingAssessment.assessorId !== updatedBy) {
      throw new Error('Not authorized to update this assessment')
    }

    const { type, ...baseData } = input

    // Update base rapid assessment
    const updatedAssessment = await prisma.rapidAssessment.update({
      where: { id },
      data: {
        ...baseData,
        updatedAt: new Date()
      },
      include: {
        healthAssessment: true,
        populationAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true
      }
    })

    // Recalculate incident severity bottom-up
    if (updatedAssessment.incidentId) {
      try {
        const { incidentSeverityService } = await import('@/lib/services/incident-severity.service');
        await incidentSeverityService.recalculateIncidentSeverity(updatedAssessment.incidentId)
      } catch {}
    }

    return updatedAssessment as unknown as RapidAssessmentWithData
  }

  static async delete(id: string, deletedBy: string): Promise<void> {
    // Check if assessment exists and user has permission
    const existingAssessment = await prisma.rapidAssessment.findUnique({
      where: { id },
      select: { assessorId: true, incidentId: true }
    })

    if (!existingAssessment) {
      throw new Error('Assessment not found')
    }

    if (existingAssessment.assessorId !== deletedBy) {
      throw new Error('Not authorized to delete this assessment')
    }

    const incidentId = existingAssessment.incidentId

    // Delete assessment (cascade will handle type-specific assessment)
    await prisma.rapidAssessment.delete({
      where: { id }
    })

    // Recalculate incident severity bottom-up
    if (incidentId) {
      try {
        const { incidentSeverityService } = await import('@/lib/services/incident-severity.service');
        await incidentSeverityService.recalculateIncidentSeverity(incidentId)
      } catch {}
    }
  }

  static async submit(id: string, submittedBy: string): Promise<RapidAssessmentWithData> {
    const assessment = await this.findById(id)
    if (!assessment) {
      throw new Error('Assessment not found')
    }

    if (assessment.assessorId !== submittedBy) {
      throw new Error('Not authorized to submit this assessment')
    }

    const updatedAssessment = await prisma.rapidAssessment.update({
      where: { id },
      data: {
        verificationStatus: 'SUBMITTED',
        updatedAt: new Date()
      },
      include: {
        healthAssessment: true,
        populationAssessment: true,
        foodAssessment: true,
        washAssessment: true,
        shelterAssessment: true,
        securityAssessment: true
      }
    })

    // Automatically trigger gap analysis calculation after successful submission
    await this.triggerGapAnalysis(id)

    try {
      const { ActionSignalService } = await import('@/lib/services/action-signal.service');
      await ActionSignalService.evaluateAndGenerate({
        trigger: 'assessment-submitted',
        entityId: updatedAssessment.entityId,
        incidentId: updatedAssessment.incidentId,
        assessmentId: id,
        assessmentType: updatedAssessment.rapidAssessmentType,
        assessmentPriority: updatedAssessment.priority,
      });
    } catch (e) {
      console.error('[RapidAssessmentService] signal hook error:', e);
    }

    return updatedAssessment as unknown as RapidAssessmentWithData
  }

  /**
   * Calculate and trigger gap analysis for a submitted assessment
   * This should be called after successful assessment submission
   */
  static async triggerGapAnalysis(assessmentId: string): Promise<void> {
    try {
      const assessment = await this.findById(assessmentId)
      if (!assessment) {
        console.warn(`Assessment ${assessmentId} not found for gap analysis`)
        return
      }

      // Calculate gap analysis based on assessment type and data
      const gapAnalysisData: { gapAnalysis?: HealthGapAnalysis | FoodGapAnalysis | WASHGapAnalysis | ShelterGapAnalysis | SecurityGapAnalysis } = {}
      let calculatedSeverity: string | null = null

      switch (assessment.rapidAssessmentType) {
        case 'HEALTH':
          if (assessment.healthAssessment) {
            gapAnalysisData.gapAnalysis = await analyzeHealthGaps(assessment.healthAssessment as unknown as Record<string, unknown>)
            calculatedSeverity = gapAnalysisData.gapAnalysis.severity
          }
          break
        case 'FOOD':
          if (assessment.foodAssessment) {
            gapAnalysisData.gapAnalysis = await analyzeFoodGaps(assessment.foodAssessment as unknown as Record<string, unknown>)
            calculatedSeverity = gapAnalysisData.gapAnalysis.severity
          }
          break
        case 'WASH':
          if (assessment.wASHAssessment) {
            gapAnalysisData.gapAnalysis = await analyzeWASHGaps(assessment.wASHAssessment as unknown as Record<string, unknown>)
            calculatedSeverity = gapAnalysisData.gapAnalysis.severity
          }
          break
        case 'SHELTER':
          if (assessment.shelterAssessment) {
            gapAnalysisData.gapAnalysis = await analyzeShelterGaps(assessment.shelterAssessment as unknown as Record<string, unknown>)
            calculatedSeverity = gapAnalysisData.gapAnalysis.severity
          }
          break
        case 'SECURITY':
          if (assessment.securityAssessment) {
            gapAnalysisData.gapAnalysis = await analyzeSecurityGaps(assessment.securityAssessment as unknown as Record<string, unknown>)
            calculatedSeverity = gapAnalysisData.gapAnalysis.severity
          }
          break
      }

      // Update the assessment with gap analysis data AND priority based on calculated severity
      if (Object.keys(gapAnalysisData).length > 0 && calculatedSeverity) {
        await prisma.rapidAssessment.update({
          where: { id: assessmentId },
          data: {
            gapAnalysis: gapAnalysisData.gapAnalysis as unknown as Prisma.InputJsonObject,
            priority: calculatedSeverity as unknown as Priority // Set priority to match severity from gap analysis
          }
        })
      } else if (Object.keys(gapAnalysisData).length > 0) {
        // Fallback: update without priority change if severity calculation failed
        await prisma.rapidAssessment.update({
          where: { id: assessmentId },
          data: {
            gapAnalysis: gapAnalysisData.gapAnalysis as unknown as Prisma.InputJsonObject
          }
        })
      }

      // Recalculate incident severity after gap analysis updates priority
      if (assessment.incidentId) {
        try {
          const { incidentSeverityService } = await import('@/lib/services/incident-severity.service');
          await incidentSeverityService.recalculateIncidentSeverity(assessment.incidentId)
        } catch {}
      }

      console.log(`Gap analysis calculated for assessment ${assessmentId} (${assessment.rapidAssessmentType})`)
    } catch (error) {
      console.error('Error calculating gap analysis:', error)
      // Don't throw error to avoid breaking submission workflow
    }
  }

  /**
   * Updates all historical assessments to have correct priorities based on gap analysis severity
   * This method should be called once to migrate existing assessments to the new priority system
   */
  static async updateAllHistoricalAssessmentPriorities(): Promise<{ updated: number; failed: number; total: number }> {
    try {
      console.log('Starting historical assessment priority update...')

      // Fetch all assessments that need priority updates
      const allAssessments = await prisma.rapidAssessment.findMany({
        include: {
          healthAssessment: true,
          populationAssessment: true,
          foodAssessment: true,
          washAssessment: true,
          shelterAssessment: true,
          securityAssessment: true
        }
      })

      console.log(`Found ${allAssessments.length} assessments to process`)

      let updatedCount = 0
      let failedCount = 0

      for (const assessment of allAssessments) {
        try {
          // Calculate gap analysis based on assessment type and data
          const gapAnalysisData: { gapAnalysis?: HealthGapAnalysis | FoodGapAnalysis | WASHGapAnalysis | ShelterGapAnalysis | SecurityGapAnalysis } = {}
          let calculatedSeverity: string | null = null

          switch (assessment.rapidAssessmentType) {
            case 'HEALTH':
              if (assessment.healthAssessment) {
                gapAnalysisData.gapAnalysis = await analyzeHealthGaps(assessment.healthAssessment as unknown as Record<string, unknown>)
                calculatedSeverity = gapAnalysisData.gapAnalysis.severity
              }
              break
            case 'FOOD':
              if (assessment.foodAssessment) {
                gapAnalysisData.gapAnalysis = await analyzeFoodGaps(assessment.foodAssessment as unknown as Record<string, unknown>)
                calculatedSeverity = gapAnalysisData.gapAnalysis.severity
              }
              break
            case 'WASH':
              if (assessment.washAssessment) {
                gapAnalysisData.gapAnalysis = await analyzeWASHGaps(assessment.washAssessment as unknown as Record<string, unknown>)
                calculatedSeverity = gapAnalysisData.gapAnalysis.severity
              }
              break
            case 'SHELTER':
              if (assessment.shelterAssessment) {
                gapAnalysisData.gapAnalysis = await analyzeShelterGaps(assessment.shelterAssessment as unknown as Record<string, unknown>)
                calculatedSeverity = gapAnalysisData.gapAnalysis.severity
              }
              break
            case 'SECURITY':
              if (assessment.securityAssessment) {
                gapAnalysisData.gapAnalysis = await analyzeSecurityGaps(assessment.securityAssessment as unknown as Record<string, unknown>)
                calculatedSeverity = gapAnalysisData.gapAnalysis.severity
              }
              break
          }

          // Update the assessment with gap analysis data AND priority based on calculated severity
          if (Object.keys(gapAnalysisData).length > 0 && calculatedSeverity) {
            await prisma.rapidAssessment.update({
              where: { id: assessment.id },
              data: {
                gapAnalysis: gapAnalysisData.gapAnalysis as unknown as Prisma.InputJsonObject,
                priority: calculatedSeverity as unknown as Priority
              }
            })
            console.log(`Updated assessment ${assessment.id} (${assessment.rapidAssessmentType}) - Priority: ${calculatedSeverity}`)
            updatedCount++
          } else {
            console.log(`No gap analysis data for assessment ${assessment.id} (${assessment.rapidAssessmentType})`)
          }
        } catch (error) {
          console.error(`Failed to update assessment ${assessment.id}:`, error)
          failedCount++
        }
      }

      console.log(`Historical assessment priority update completed. Updated: ${updatedCount}, Failed: ${failedCount}, Total: ${allAssessments.length}`)

      return {
        updated: updatedCount,
        failed: failedCount,
        total: allAssessments.length
      }
    } catch (error) {
      console.error('Error updating historical assessment priorities:', error)
      throw error
    }
  }

  private static async validateEntityAssignment(userId: string, entityId: string): Promise<void> {
    // Check if user is assigned to this entity
    const assignment = await prisma.entityAssignment.findFirst({
      where: {
        userId,
        entityId
      }
    })

    if (!assignment) {
      throw new Error('User is not assigned to this entity')
    }
  }

  static async findLatestByIncidentEntityAndType(
    incidentId: string,
    entityId: string,
    type: AssessmentType
  ): Promise<RapidAssessmentWithData | null> {
    try {
      const typeFieldName = this.getTypeSpecificFieldName(type)
      
      const assessment = await prisma.rapidAssessment.findFirst({
        where: {
          incidentId,
          entityId,
          rapidAssessmentType: type,
          verificationStatus: {
            not: 'DRAFT'
          }
        },
        include: {
          [typeFieldName]: true
        },
        orderBy: {
          rapidAssessmentDate: 'desc'
        }
      })

      return assessment as unknown as RapidAssessmentWithData
    } catch (error) {
      console.error('Error finding latest assessment:', error)
      throw new Error('Failed to find latest assessment')
    }
  }

  private static getTypeSpecificFieldName(type: AssessmentType): string {
    const fieldMap = {
      'HEALTH': 'healthAssessment',
      'POPULATION': 'populationAssessment',
      'FOOD': 'foodAssessment',
      'WASH': 'wASHAssessment',
      'SHELTER': 'shelterAssessment',
      'SECURITY': 'securityAssessment'
    }

    return fieldMap[type] || 'healthAssessment'
  }
}