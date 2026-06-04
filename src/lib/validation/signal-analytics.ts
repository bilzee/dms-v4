import { z } from 'zod';

export const SignalAnalyticsQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('7d'),
  role: z.enum(['ASSESSOR', 'RESPONDER', 'DONOR', 'COORDINATOR']).optional(),
  incidentId: z.string().uuid().optional(),
  entityId: z.string().uuid().optional(),
  signalReason: z.enum([
    'reassessment-needed', 'overdue', 'awaiting-plan', 'awaiting-plan-for-commitment',
    'awaiting-delivery', 'partially-covered', 'assessment-needs-response',
    'plan-needs-commitment', 'partially-fulfilled', 'assessment-awaiting-verification',
    'delivery-awaiting-verification', 'verification-overdue', 'entity-needs-responder',
    'entity-needs-donor'
  ]).optional(),
});

export type SignalAnalyticsQueryInput = z.infer<typeof SignalAnalyticsQuerySchema>;
