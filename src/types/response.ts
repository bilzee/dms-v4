import { z } from 'zod'

export const RapidResponseSchema = z.object({
  id: z.string(),
  responderId: z.string(),
  entityId: z.string(),
  assessmentId: z.string(),
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'LOGISTICS']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  deliveryStatus: z.enum(['PLANNED', 'DELIVERED']).default('PLANNED'),
  description: z.string().optional(),
  items: z.array(z.object({
    name: z.string(),
    unit: z.string(),
    quantity: z.number(),
    category: z.string().optional(),
    notes: z.string().optional()
  })),
  timeline: z.record(z.any()).optional(),
  versionNumber: z.number().default(1),
  isOfflineCreated: z.boolean().default(false),
  verificationStatus: z.enum(['DRAFT', 'SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED']).default('DRAFT'),
  verifiedAt: z.date().nullable(),
  verifiedBy: z.string().nullable(),
  plannedDate: z.date(),
  responseDate: z.date().nullable(),
  rejectionFeedback: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  syncStatus: z.enum(['PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT', 'LOCAL']).default('LOCAL'),
  createdAt: z.date(),
  updatedAt: z.date(),
  donorId: z.string().nullable(),
  offlineId: z.string().nullable().optional(),
  
  // Relations
  assessment: z.object({
    id: z.string(),
    rapidAssessmentType: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']),
    rapidAssessmentDate: z.date(),
    status: z.enum(['DRAFT', 'SUBMITTED', 'VERIFIED', 'PUBLISHED']),
    verificationStatus: z.enum(['DRAFT', 'SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED']),
    entity: z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['COMMUNITY', 'WARD', 'LGA', 'STATE', 'FACILITY', 'CAMP'])
    }).optional()
  }).optional(),
  
  entity: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['COMMUNITY', 'WARD', 'LGA', 'STATE', 'FACILITY', 'CAMP'])
  }).optional(),
  
  responder: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string()
  }).optional(),
  
  donor: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['INDIVIDUAL', 'ORGANIZATION', 'GOVERNMENT', 'NGO', 'CORPORATE']),
    contactEmail: z.string().nullable()
  }).nullable().optional()
})

export const RapidResponseListSchema = z.object({
  responses: z.array(RapidResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number()
})

export type RapidResponse = z.infer<typeof RapidResponseSchema>
export type RapidResponseList = z.infer<typeof RapidResponseListSchema>

// API Response Types
export interface CreatePlannedResponseResponse {
  success?: true
  data: RapidResponse
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface GetResponseResponse {
  success?: true
  data: RapidResponse
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface GetResponsesResponse {
  success?: true
  data: RapidResponse[]
  meta: {
    total: number
    page: number
    limit: number
    timestamp: string
    version: string
    requestId: string
  }
}

export interface UpdateResponseResponse {
  success?: true
  data: RapidResponse
  meta: {
    timestamp: string
    version: string
    requestId: string
  }
}