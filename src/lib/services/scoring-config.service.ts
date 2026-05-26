import { prisma } from '@/lib/db/client';

export interface ScoringConfig {
  deliveryWeight: number;
  speedWeight: number;
  valueWeight: number;
  consistencyWeight: number;
  speedZeroScoreHours: number;
  speedPenaltyRate: number;
  valueCap: number;
  valueCurrency: string;
  consistencyMaxActivitiesPerDay: number;
}

const DEFAULT_CONFIG: ScoringConfig = {
  deliveryWeight: 60,
  speedWeight: 20,
  valueWeight: 10,
  consistencyWeight: 10,
  speedZeroScoreHours: 120,
  speedPenaltyRate: 20,
  valueCap: 1_000_000,
  valueCurrency: 'NGN',
  consistencyMaxActivitiesPerDay: 0.1,
};

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedConfig: ScoringConfig | null = null;
let cacheExpiry = 0;

export function getDefaultConfig(): ScoringConfig {
  return { ...DEFAULT_CONFIG };
}

export async function getScoringConfig(): Promise<ScoringConfig> {
  if (cachedConfig && Date.now() < cacheExpiry) {
    return { ...cachedConfig };
  }

  const rows = await prisma.systemSetting.findMany({
    where: { section: 'scoring' },
  });

  const map = new Map(rows.map((r) => [r.key, r.value as any]));

  const config: ScoringConfig = { ...DEFAULT_CONFIG };

  const numKeys: (keyof ScoringConfig)[] = [
    'deliveryWeight',
    'speedWeight',
    'valueWeight',
    'consistencyWeight',
    'speedZeroScoreHours',
    'speedPenaltyRate',
    'valueCap',
    'consistencyMaxActivitiesPerDay',
  ];

  for (const key of numKeys) {
    const raw = map.get(key);
    if (raw !== undefined && raw !== null) {
      const parsed = Number(raw);
      if (!isNaN(parsed)) {
        (config as any)[key] = parsed;
      }
    }
  }

  const currency = map.get('valueCurrency');
  if (typeof currency === 'string' && currency.length <= 10) {
    config.valueCurrency = currency;
  }

  cachedConfig = config;
  cacheExpiry = Date.now() + CACHE_TTL_MS;

  return { ...config };
}

export function invalidateScoringConfigCache(): void {
  cachedConfig = null;
  cacheExpiry = 0;
}

export function validateScoringConfig(config: ScoringConfig): string[] {
  const errors: string[] = [];

  const weightSum =
    config.deliveryWeight +
    config.speedWeight +
    config.valueWeight +
    config.consistencyWeight;

  if (weightSum !== 100) {
    errors.push(`Weights must sum to 100%. Current total: ${weightSum}%`);
  }

  if (config.deliveryWeight < 0 || config.deliveryWeight > 100) errors.push('Delivery weight must be 0–100');
  if (config.speedWeight < 0 || config.speedWeight > 100) errors.push('Speed weight must be 0–100');
  if (config.valueWeight < 0 || config.valueWeight > 100) errors.push('Value weight must be 0–100');
  if (config.consistencyWeight < 0 || config.consistencyWeight > 100) errors.push('Consistency weight must be 0–100');

  if (config.speedZeroScoreHours < 1 || config.speedZeroScoreHours > 720) errors.push('Speed zero-score hours must be 1–720');
  if (config.speedPenaltyRate < 1 || config.speedPenaltyRate > 100) errors.push('Speed penalty rate must be 1–100');
  if (config.valueCap < 1 || config.valueCap > 100_000_000) errors.push('Value cap must be 1–100,000,000');
  if (config.consistencyMaxActivitiesPerDay < 0.001 || config.consistencyMaxActivitiesPerDay > 100) errors.push('Consistency max activities/day must be 0.001–100');

  return errors;
}

export async function saveScoringConfig(
  config: ScoringConfig,
  userId: string
): Promise<void> {
  const errors = validateScoringConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  const entries = Object.entries(config) as [string, string | number][];

  for (const [key, value] of entries) {
    await prisma.systemSetting.upsert({
      where: {
        section_key: { section: 'scoring', key },
      },
      create: {
        section: 'scoring',
        key,
        value,
        updatedBy: userId,
      },
      update: {
        value,
        updatedBy: userId,
      },
    });
  }

  invalidateScoringConfigCache();
}
