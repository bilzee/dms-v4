import { prisma } from '@/lib/db/client';

export type SignalPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface NotificationConfig {
  pushEnabled: boolean;
  inAppEnabled: boolean;
  pushPriorities: SignalPriority[];
  inAppPriorities: SignalPriority[];
  notificationTTLHours: number;
  pushCooldownMinutes: number;
  inAppCooldownMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  emailEnabled: boolean;
  emailPriorities: SignalPriority[];
  emailDigestEnabled: boolean;
  emailDigestTime: string;
}

const DEFAULT_CONFIG: NotificationConfig = {
  pushEnabled: true,
  inAppEnabled: true,
  pushPriorities: ['CRITICAL', 'HIGH'],
  inAppPriorities: ['CRITICAL', 'HIGH', 'MEDIUM'],
  notificationTTLHours: 24,
  pushCooldownMinutes: 15,
  inAppCooldownMinutes: 5,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  emailEnabled: false,
  emailPriorities: ['CRITICAL', 'HIGH'],
  emailDigestEnabled: false,
  emailDigestTime: '08:00',
};

const ALL_PRIORITIES: SignalPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const CACHE_TTL_MS = 2 * 60 * 1000;

let cachedConfig: NotificationConfig | null = null;
let cacheExpiry = 0;

export function getDefaultNotificationConfig(): NotificationConfig {
  return {
    ...DEFAULT_CONFIG,
    pushPriorities: [...DEFAULT_CONFIG.pushPriorities],
    inAppPriorities: [...DEFAULT_CONFIG.inAppPriorities],
    emailPriorities: [...DEFAULT_CONFIG.emailPriorities],
  };
}

export async function getNotificationConfig(): Promise<NotificationConfig> {
  if (cachedConfig && Date.now() < cacheExpiry) {
    return {
      ...cachedConfig,
      pushPriorities: [...cachedConfig.pushPriorities],
      inAppPriorities: [...cachedConfig.inAppPriorities],
      emailPriorities: [...cachedConfig.emailPriorities],
    };
  }

  const rows = await prisma.systemSetting.findMany({
    where: { section: 'notification' },
  });

  const map = new Map(rows.map((r) => [r.key, r.value as any]));

  const config: NotificationConfig = {
    pushEnabled: map.get('pushEnabled') ?? DEFAULT_CONFIG.pushEnabled,
    inAppEnabled: map.get('inAppEnabled') ?? DEFAULT_CONFIG.inAppEnabled,
    pushPriorities: parsePriorities(map.get('pushPriorities'), DEFAULT_CONFIG.pushPriorities),
    inAppPriorities: parsePriorities(map.get('inAppPriorities'), DEFAULT_CONFIG.inAppPriorities),
    notificationTTLHours: clampNum(map.get('notificationTTLHours'), DEFAULT_CONFIG.notificationTTLHours, 1, 168),
    pushCooldownMinutes: clampNum(map.get('pushCooldownMinutes'), DEFAULT_CONFIG.pushCooldownMinutes, 0, 1440),
    inAppCooldownMinutes: clampNum(map.get('inAppCooldownMinutes'), DEFAULT_CONFIG.inAppCooldownMinutes, 0, 1440),
    quietHoursEnabled: map.get('quietHoursEnabled') ?? DEFAULT_CONFIG.quietHoursEnabled,
    quietHoursStart: parseTimeStr(map.get('quietHoursStart'), DEFAULT_CONFIG.quietHoursStart),
    quietHoursEnd: parseTimeStr(map.get('quietHoursEnd'), DEFAULT_CONFIG.quietHoursEnd),
    emailEnabled: map.get('emailEnabled') ?? DEFAULT_CONFIG.emailEnabled,
    emailPriorities: parsePriorities(map.get('emailPriorities'), DEFAULT_CONFIG.emailPriorities),
    emailDigestEnabled: map.get('emailDigestEnabled') ?? DEFAULT_CONFIG.emailDigestEnabled,
    emailDigestTime: parseTimeStr(map.get('emailDigestTime'), DEFAULT_CONFIG.emailDigestTime),
  };

  cachedConfig = config;
  cacheExpiry = Date.now() + CACHE_TTL_MS;

  return {
    ...config,
    pushPriorities: [...config.pushPriorities],
    inAppPriorities: [...config.inAppPriorities],
    emailPriorities: [...config.emailPriorities],
  };
}

export function invalidateNotificationConfigCache(): void {
  cachedConfig = null;
  cacheExpiry = 0;
}

export function validateNotificationConfig(config: NotificationConfig): string[] {
  const errors: string[] = [];

  if (config.notificationTTLHours < 1 || config.notificationTTLHours > 168) {
    errors.push('Notification TTL must be between 1 and 168 hours');
  }
  if (config.pushCooldownMinutes < 0 || config.pushCooldownMinutes > 1440) {
    errors.push('Push cooldown must be between 0 and 1440 minutes');
  }
  if (config.inAppCooldownMinutes < 0 || config.inAppCooldownMinutes > 1440) {
    errors.push('In-app cooldown must be between 0 and 1440 minutes');
  }
  if (!Array.isArray(config.pushPriorities) || config.pushPriorities.some(p => !ALL_PRIORITIES.includes(p))) {
    errors.push('Invalid push priority selection');
  }
  if (!Array.isArray(config.inAppPriorities) || config.inAppPriorities.some(p => !ALL_PRIORITIES.includes(p))) {
    errors.push('Invalid in-app priority selection');
  }
  if (!Array.isArray(config.emailPriorities) || config.emailPriorities.some(p => !ALL_PRIORITIES.includes(p))) {
    errors.push('Invalid email priority selection');
  }
  if (config.emailDigestEnabled) {
    if (!/^\d{2}:\d{2}$/.test(config.emailDigestTime)) errors.push('Digest time must be HH:MM format');
  }
  const timeRegex = /^\d{2}:\d{2}$/;
  if (config.quietHoursEnabled) {
    if (!timeRegex.test(config.quietHoursStart)) errors.push('Quiet hours start must be HH:MM format');
    if (!timeRegex.test(config.quietHoursEnd)) errors.push('Quiet hours end must be HH:MM format');
  }

  return errors;
}

export async function saveNotificationConfig(
  config: NotificationConfig,
  userId: string
): Promise<void> {
  const errors = validateNotificationConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  const entries: [string, any][] = [
    ['pushEnabled', config.pushEnabled],
    ['inAppEnabled', config.inAppEnabled],
    ['pushPriorities', config.pushPriorities],
    ['inAppPriorities', config.inAppPriorities],
    ['notificationTTLHours', config.notificationTTLHours],
    ['pushCooldownMinutes', config.pushCooldownMinutes],
    ['inAppCooldownMinutes', config.inAppCooldownMinutes],
    ['quietHoursEnabled', config.quietHoursEnabled],
    ['quietHoursStart', config.quietHoursStart],
    ['quietHoursEnd', config.quietHoursEnd],
    ['emailEnabled', config.emailEnabled],
    ['emailPriorities', config.emailPriorities],
    ['emailDigestEnabled', config.emailDigestEnabled],
    ['emailDigestTime', config.emailDigestTime],
  ];

  for (const [key, value] of entries) {
    await prisma.systemSetting.upsert({
      where: { section_key: { section: 'notification', key } },
      create: { section: 'notification', key, value, updatedBy: userId },
      update: { value, updatedBy: userId },
    });
  }

  invalidateNotificationConfigCache();
}

export function shouldSendPush(priority: string, config: NotificationConfig): boolean {
  return config.pushEnabled && (config.pushPriorities as string[]).includes(priority);
}

export function shouldSendInApp(priority: string, config: NotificationConfig): boolean {
  return config.inAppEnabled && (config.inAppPriorities as string[]).includes(priority);
}

export function shouldSendEmail(priority: string, config: NotificationConfig): boolean {
  return config.emailEnabled && (config.emailPriorities as string[]).includes(priority);
}

function parsePriorities(raw: unknown, defaults: SignalPriority[]): SignalPriority[] {
  if (!Array.isArray(raw)) return [...defaults];
  const filtered = raw.filter((p: string) => ALL_PRIORITIES.includes(p as SignalPriority));
  return filtered.length > 0 ? filtered : [...defaults];
}

function clampNum(raw: unknown, def: number, min: number, max: number): number {
  const n = Number(raw);
  if (isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function parseTimeStr(raw: unknown, def: string): string {
  if (typeof raw !== 'string' || !/^\d{2}:\d{2}$/.test(raw)) return def;
  return raw;
}
