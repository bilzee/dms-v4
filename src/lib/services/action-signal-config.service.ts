import { prisma } from '@/lib/db/client';
import type { SignalReason, SignalTargetRole } from '@/types/action-signal';
import { SIGNAL_REASON_ROLES } from '@/types/action-signal';

export type RoleSignalConfig = Record<SignalReason, boolean>;
export type ActionSignalConfig = Record<SignalTargetRole, RoleSignalConfig>;

const ROLES: SignalTargetRole[] = ['ASSESSOR', 'RESPONDER', 'DONOR', 'COORDINATOR'];

function buildDefaultForRole(role: SignalTargetRole): RoleSignalConfig {
  const config: Partial<RoleSignalConfig> = {};
  const reasons = Object.entries(SIGNAL_REASON_ROLES)
    .filter(([, roles]) => roles.includes(role))
    .map(([reason]) => reason as SignalReason);
  for (const reason of reasons) {
    config[reason] = true;
  }
  return config as RoleSignalConfig;
}

const DEFAULT_CONFIG: ActionSignalConfig = {
  ASSESSOR: buildDefaultForRole('ASSESSOR'),
  RESPONDER: buildDefaultForRole('RESPONDER'),
  DONOR: buildDefaultForRole('DONOR'),
  COORDINATOR: buildDefaultForRole('COORDINATOR'),
};

const CACHE_TTL_MS = 2 * 60 * 1000;

let cachedConfig: ActionSignalConfig | null = null;
let cacheExpiry = 0;

export function getDefaultActionSignalConfig(): ActionSignalConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

export async function getActionSignalConfig(): Promise<ActionSignalConfig> {
  if (cachedConfig && Date.now() < cacheExpiry) {
    return JSON.parse(JSON.stringify(cachedConfig));
  }

  const rows = await prisma.systemSetting.findMany({
    where: { section: 'action-signals' },
  });

  const map = new Map(rows.map((r) => [r.key, r.value as any]));

  const config: ActionSignalConfig = {
    ASSESSOR: mergeWithDefaults('ASSESSOR', map.get('assessor')),
    RESPONDER: mergeWithDefaults('RESPONDER', map.get('responder')),
    DONOR: mergeWithDefaults('DONOR', map.get('donor')),
    COORDINATOR: mergeWithDefaults('COORDINATOR', map.get('coordinator')),
  };

  cachedConfig = config;
  cacheExpiry = Date.now() + CACHE_TTL_MS;

  return JSON.parse(JSON.stringify(config));
}

export function invalidateActionSignalConfigCache(): void {
  cachedConfig = null;
  cacheExpiry = 0;
}

export async function isSignalEnabled(
  role: string,
  reason: SignalReason
): Promise<boolean> {
  const config = await getActionSignalConfig();
  const roleKey = role as SignalTargetRole;
  const roleConfig = config[roleKey];
  if (!roleConfig) return true;
  return roleConfig[reason] ?? true;
}

export async function saveActionSignalConfig(
  config: ActionSignalConfig,
  userId: string
): Promise<void> {
  const entries: [string, any][] = [
    ['assessor', config.ASSESSOR],
    ['responder', config.RESPONDER],
    ['donor', config.DONOR],
    ['coordinator', config.COORDINATOR],
  ];

  for (const [key, value] of entries) {
    await prisma.systemSetting.upsert({
      where: { section_key: { section: 'action-signals', key } },
      create: { section: 'action-signals', key, value, updatedBy: userId },
      update: { value, updatedBy: userId },
    });
  }

  invalidateActionSignalConfigCache();
}

function mergeWithDefaults(
  role: SignalTargetRole,
  stored: unknown
): RoleSignalConfig {
  const defaults = DEFAULT_CONFIG[role];
  if (!stored || typeof stored !== 'object') return { ...defaults };

  const result: Partial<RoleSignalConfig> = {};
  for (const reason of Object.keys(defaults) as SignalReason[]) {
    result[reason] = typeof (stored as any)[reason] === 'boolean'
      ? (stored as any)[reason]
      : defaults[reason];
  }
  return result as RoleSignalConfig;
}

export { ROLES };
