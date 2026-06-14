import { z } from 'zod'

export const PreliminaryAssessmentSchema = z.object({
  reportingDate: z.string().min(1, 'Reporting date is required'),
  reportingLatitude: z.number().min(-90).max(90),
  reportingLongitude: z.number().min(-180).max(180),
  reportingLGA: z.string().min(1, 'LGA is required'),
  reportingWard: z.string().min(1, 'Ward is required'),
  numberLivesLost: z.number().int().min(0).default(0),
  numberInjured: z.number().int().min(0).default(0),
  numberDisplaced: z.number().int().min(0).default(0),
  numberHousesAffected: z.number().int().min(0).default(0),
  numberSchoolsAffected: z.number().int().min(0).default(0),
  schoolsAffected: z.string().optional(),
  numberMedicalFacilitiesAffected: z.number().int().min(0).default(0),
  medicalFacilitiesAffected: z.string().optional(),
  estimatedAgriculturalLandsAffected: z.number().optional(),
  reportingAgent: z.string().min(1, 'Reporting agent is required'),
  additionalDetails: z.any().optional(),
  incidentId: z.string().nullable().optional(),
  affectedEntityIds: z.array(z.string()).optional().default([])
})

export const CreatePreliminaryAssessmentSchema = z.object({
  data: PreliminaryAssessmentSchema,
  createIncident: z.boolean().optional().default(false),
  incidentData: z.object({
    type: z.string().min(1, 'Incident type is required'),
    subType: z.string().optional(),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    description: z.string().min(1, 'Incident description is required'),
    location: z.string().min(1, 'Incident location is required')
  }).optional()
})

export const UpdatePreliminaryAssessmentSchema = z.object({
  data: PreliminaryAssessmentSchema.partial()
})

export const QueryPreliminaryAssessmentSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  userId: z.string().optional(),
  incidentId: z.string().nullable().optional(),
  lga: z.string().optional(),
  ward: z.string().optional()
})

export type PreliminaryAssessmentInput = z.infer<typeof PreliminaryAssessmentSchema>
export type CreatePreliminaryAssessmentInput = z.infer<typeof CreatePreliminaryAssessmentSchema>
export type UpdatePreliminaryAssessmentInput = z.infer<typeof UpdatePreliminaryAssessmentSchema>
export type QueryPreliminaryAssessmentInput = z.infer<typeof QueryPreliminaryAssessmentSchema>