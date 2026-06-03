import { z } from 'zod';

export const SignalQuerySchema = z.object({
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  signalReason: z.enum([
    'reassessment-needed',
    'overdue',
    'awaiting-plan',
    'awaiting-plan-for-commitment',
    'awaiting-delivery',
    'partially-covered',
    'assessment-needs-response',
    'plan-needs-commitment',
    'partially-fulfilled',
    'commitment-awaiting-plan',
    'assessment-awaiting-verification',
    'delivery-awaiting-verification',
    'verification-overdue',
  ]).optional(),
  activeRole: z.enum(['ASSESSOR', 'RESPONDER', 'DONOR', 'COORDINATOR', 'ADMIN']).optional(),
  entityId: z.string().optional(),
  incidentId: z.string().optional(),
  type: z.enum(['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION']).optional(),
  unresolvedOnly: z
    .preprocess(val => val === 'true' || val === true, z.boolean())
    .optional()
    .default(true),
  grouped: z
    .preprocess(val => val === 'true' || val === true, z.boolean())
    .optional()
    .default(false),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(50),
});

export type SignalQueryInput = z.infer<typeof SignalQuerySchema>;
