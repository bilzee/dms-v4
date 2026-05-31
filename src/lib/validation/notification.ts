import { z } from 'zod';

export const NotificationQuerySchema = z.object({
  unreadOnly: z
    .preprocess(val => val === 'true' || val === true, z.boolean())
    .optional()
    .default(false),
  includeExpired: z
    .preprocess(val => val === 'true' || val === true, z.boolean())
    .optional()
    .default(false),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(50),
});

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url('Valid push endpoint URL required'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key required'),
    auth: z.string().min(1, 'auth key required'),
  }),
  browserInfo: z.string().optional(),
});

export type NotificationQueryInput = z.infer<typeof NotificationQuerySchema>;
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>;
