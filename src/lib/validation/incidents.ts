import { z } from 'zod'

export const IncidentSchema = z.object({
  type: z.string().min(1, 'Incident type is required'),
  subType: z.string().optional(),
  status: z.enum(['ACTIVE', 'CONTAINED', 'RESOLVED']).default('ACTIVE'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().min(1, 'Location is required'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
})

export const CreateIncidentSchema = z.object({
  data: IncidentSchema,
  preliminaryAssessmentId: z.string().optional()
})

export const UpdateIncidentSchema = z.object({
  status: z.enum(['ACTIVE', 'CONTAINED', 'RESOLVED']).optional(),
  description: z.string().min(1, 'Description is required').optional(),
  location: z.string().min(1, 'Location is required').optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
})

export const QueryIncidentSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  type: z.string().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  status: z.enum(['ACTIVE', 'CONTAINED', 'RESOLVED']).optional(),
  entityId: z.string().optional()
})

export type IncidentInput = z.infer<typeof IncidentSchema>
export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>
export type QueryIncidentInput = z.infer<typeof QueryIncidentSchema>