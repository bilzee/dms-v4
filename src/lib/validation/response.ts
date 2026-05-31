import { z } from 'zod'

export const ResponseItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().positive('Quantity must be positive'),
  category: z.string().optional(),
  notes: z.string().optional()
})

export const CreatePlannedResponseSchema = z.object({
  assessmentId: z.string().min(1, 'Assessment ID is required'),
  entityId: z.string().min(1, 'Entity ID is required'),
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'LOGISTICS']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  description: z.string().optional(),
  items: z.array(ResponseItemSchema).min(1, 'At least one item is required'),
  timeline: z.record(z.any()).optional()
})

export const UpdatePlannedResponseSchema = z.object({
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'LOGISTICS']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  description: z.string().optional(),
  items: z.array(ResponseItemSchema).optional(),
  timeline: z.record(z.any()).optional()
})

export const CreateDeliveredResponseSchema = z.object({
  assessmentId: z.string().min(1, 'Assessment ID is required'),
  entityId: z.string().min(1, 'Entity ID is required'),
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'LOGISTICS']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  description: z.string().optional(),
  items: z.array(ResponseItemSchema).min(1, 'At least one item is required'),
  timeline: z.record(z.any()).optional(),
  deliveryNotes: z.string().optional()
})

export const ResponseQuerySchema = z.object({
  assessmentId: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  incidentId: z.string().min(1).optional(),
  deliveryStatus: z.enum(['PLANNED', 'DELIVERED']).optional(),
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'LOGISTICS']).optional(),
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(20)
})

export const ConfirmDeliverySchema = z.object({
  deliveredItems: z.array(ResponseItemSchema).min(1, 'At least one delivered item is required'),
  deliveryLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional()
  }).optional(),
  deliveryNotes: z.string().optional(),
  mediaAttachmentIds: z.array(z.string()).optional()
})

export type CreatePlannedResponseInput = z.infer<typeof CreatePlannedResponseSchema>
export type UpdatePlannedResponseInput = z.infer<typeof UpdatePlannedResponseSchema>
export type CreateDeliveredResponseInput = z.infer<typeof CreateDeliveredResponseSchema>
export type ResponseQueryInput = z.infer<typeof ResponseQuerySchema>
export type ConfirmDeliveryInput = z.infer<typeof ConfirmDeliverySchema>
export type ResponseItem = z.infer<typeof ResponseItemSchema>