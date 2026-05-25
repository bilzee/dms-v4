import { z } from 'zod'

// Base Rapid Assessment Schema
const BaseRapidAssessmentSchema = z.object({
  rapidAssessmentDate: z.coerce.date(),
  assessorName: z.string().min(1, 'Assessor name is required'),
  location: z.string().optional(),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().optional(),
    timestamp: z.coerce.date(),
    captureMethod: z.enum(['GPS', 'MANUAL'])
  }).optional(),
  mediaAttachments: z.array(z.string()).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  entityId: z.string().min(1, 'Entity is required'),
  incidentId: z.string().min(1, 'Incident is required')
})

// Health Assessment Schema
export const HealthAssessmentSchema = z.object({
  hasFunctionalClinic: z.boolean(),
  hasEmergencyServices: z.boolean(),
  numberHealthFacilities: z.number().int().min(0),
  healthFacilityType: z.string().min(1, 'Health facility type is required'),
  qualifiedHealthWorkers: z.number().int().min(0),
  hasTrainedStaff: z.boolean(),
  hasMedicineSupply: z.boolean(),
  hasMedicalSupplies: z.boolean(),
  hasMaternalChildServices: z.boolean(),
  commonHealthIssues: z.array(z.string()).default([]),
  additionalHealthDetails: z.any().optional()
})

// Population Assessment Schema
export const PopulationAssessmentSchema = z.object({
  totalHouseholds: z.number().int().min(0),
  totalPopulation: z.number().int().min(0),
  populationMale: z.number().int().min(0),
  populationFemale: z.number().int().min(0),
  populationUnder5: z.number().int().min(0),
  pregnantWomen: z.number().int().min(0),
  lactatingMothers: z.number().int().min(0),
  personWithDisability: z.number().int().min(0),
  elderlyPersons: z.number().int().min(0),
  separatedChildren: z.number().int().min(0),
  numberLivesLost: z.number().int().min(0),
  numberInjured: z.number().int().min(0),
  additionalPopulationDetails: z.string().optional()
})

// Food Assessment Schema
export const FoodAssessmentSchema = z.object({
  isFoodSufficient: z.boolean(),
  hasRegularMealAccess: z.boolean(),
  hasInfantNutrition: z.boolean(),
  foodSource: z.array(z.string()).default([]),
  availableFoodDurationDays: z.number().int().min(0),
  additionalFoodRequiredPersons: z.number().int().min(0),
  additionalFoodRequiredHouseholds: z.number().int().min(0),
  additionalFoodDetails: z.any().optional()
})

// WASH Assessment Schema
export const WASHAssessmentSchema = z.object({
  waterSource: z.array(z.string()).default([]),
  isWaterSufficient: z.boolean(),
  hasCleanWaterAccess: z.boolean(),
  functionalLatrinesAvailable: z.number().int().min(0),
  areLatrinesSufficient: z.boolean(),
  hasHandwashingFacilities: z.boolean(),
  hasOpenDefecationConcerns: z.boolean(),
  additionalWashDetails: z.any().optional()
})

// Shelter Assessment Schema
export const ShelterAssessmentSchema = z.object({
  areSheltersSufficient: z.boolean(),
  hasSafeStructures: z.boolean(),
  shelterTypes: z.array(z.string()).default([]),
  requiredShelterType: z.array(z.string()).default([]),
  numberSheltersRequired: z.number().int().min(0),
  areOvercrowded: z.boolean(),
  provideWeatherProtection: z.boolean(),
  additionalShelterDetails: z.any().optional()
})

// Security Assessment Schema
export const SecurityAssessmentSchema = z.object({
  isSafeFromViolence: z.boolean(),
  gbvCasesReported: z.boolean(),
  hasSecurityPresence: z.boolean(),
  hasProtectionReportingMechanism: z.boolean(),
  vulnerableGroupsHaveAccess: z.boolean(),
  hasLighting: z.boolean(),
  additionalSecurityDetails: z.any().optional()
})

// Full Assessment Schemas (base + type-specific)
export const CreateHealthAssessmentSchema = BaseRapidAssessmentSchema.extend({
  type: z.literal('HEALTH'),
  healthData: HealthAssessmentSchema
})

export const CreatePopulationAssessmentSchema = BaseRapidAssessmentSchema.extend({
  type: z.literal('POPULATION'),
  populationData: PopulationAssessmentSchema
})

export const CreateFoodAssessmentSchema = BaseRapidAssessmentSchema.extend({
  type: z.literal('FOOD'),
  foodData: FoodAssessmentSchema
})

export const CreateWASHAssessmentSchema = BaseRapidAssessmentSchema.extend({
  type: z.literal('WASH'),
  washData: WASHAssessmentSchema
})

export const CreateShelterAssessmentSchema = BaseRapidAssessmentSchema.extend({
  type: z.literal('SHELTER'),
  shelterData: ShelterAssessmentSchema
})

export const CreateSecurityAssessmentSchema = BaseRapidAssessmentSchema.extend({
  type: z.literal('SECURITY'),
  securityData: SecurityAssessmentSchema
})

// Union Schema for Creating Any Assessment Type
export const CreateRapidAssessmentSchema = z.discriminatedUnion('type', [
  CreateHealthAssessmentSchema,
  CreatePopulationAssessmentSchema,
  CreateFoodAssessmentSchema,
  CreateWASHAssessmentSchema,
  CreateShelterAssessmentSchema,
  CreateSecurityAssessmentSchema
])

// Update Schemas (partial updates allowed)
export const UpdateRapidAssessmentSchema = BaseRapidAssessmentSchema.partial().extend({
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']).optional(),
  healthData: HealthAssessmentSchema.partial().optional(),
  populationData: PopulationAssessmentSchema.partial().optional(),
  foodData: FoodAssessmentSchema.partial().optional(),
  washData: WASHAssessmentSchema.partial().optional(),
  shelterData: ShelterAssessmentSchema.partial().optional(),
  securityData: SecurityAssessmentSchema.partial().optional()
})

// Query Schema
export const QueryRapidAssessmentSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  userId: z.string().optional(),
  entityId: z.string().optional(),
  incidentId: z.string().optional(),
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']).optional(),
  status: z.never().optional(),
  verificationStatus: z.enum(['DRAFT', 'SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
})

// Export Types
export type CreateRapidAssessmentInput = z.infer<typeof CreateRapidAssessmentSchema>
export type UpdateRapidAssessmentInput = z.infer<typeof UpdateRapidAssessmentSchema>
export type QueryRapidAssessmentInput = z.infer<typeof QueryRapidAssessmentSchema>
export type HealthAssessmentInput = z.infer<typeof HealthAssessmentSchema>
export type PopulationAssessmentInput = z.infer<typeof PopulationAssessmentSchema>
export type FoodAssessmentInput = z.infer<typeof FoodAssessmentSchema>
export type WASHAssessmentInput = z.infer<typeof WASHAssessmentSchema>
export type ShelterAssessmentInput = z.infer<typeof ShelterAssessmentSchema>
export type SecurityAssessmentInput = z.infer<typeof SecurityAssessmentSchema>