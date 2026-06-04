import { prisma } from '@/lib/db/client';
import { Prisma } from '@prisma/client';
import type { SignalAnalyticsQueryInput } from '@/lib/validation/signal-analytics';

type DateRange = { from: Date; to: Date };

function rangeToDateRange(range: '7d' | '30d' | '90d'): DateRange {
  const to = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

function buildWhere(input: SignalAnalyticsQueryInput): Prisma.ActionSignalWhereInput {
  const { from } = rangeToDateRange(input.range);
  const where: Prisma.ActionSignalWhereInput = {
    createdAt: { gte: from },
  };
  if (input.incidentId) where.incidentId = input.incidentId;
  if (input.entityId) where.entityId = input.entityId;
  if (input.signalReason) where.signalReason = input.signalReason;
  return where;
}

type VolumeRow = { date: Date; signalReason: string; count: number };

type ResolutionVelocityRow = { signalReason: string; median_hours: number };

type ResolutionRateRow = {
  signalReason: string;
  total: number;
  within_24h: number;
  within_48h: number;
  within_1w: number;
};

type RoleEngagementRow = {
  role_name: string;
  total_signals: number;
  resolved_signals: number;
};

type TopEntityRow = {
  id: string;
  name: string;
  type: string;
  unresolved_count: number;
  highest_priority: string;
};

const PRIORITY_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function resolveHighestPriority(priorities: string[]): string {
  if (priorities.length === 0) return 'LOW';
  return priorities.reduce((highest, current) =>
    (PRIORITY_RANK[current] ?? 0) > (PRIORITY_RANK[highest] ?? 0) ? current : highest
  , priorities[0]);
}

export class SignalAnalyticsService {

  static async getVolumeOverTime(input: SignalAnalyticsQueryInput) {
    const { from } = rangeToDateRange(input.range);

    const query = Prisma.sql`
      SELECT DATE(created_at) as date, "signalReason", COUNT(*)::int as count
      FROM action_signals asig
      WHERE created_at >= ${from}
        AND (${input.incidentId ?? null}::uuid IS NULL OR incident_id = ${input.incidentId ?? null})
        AND (${input.entityId ?? null}::uuid IS NULL OR entity_id = ${input.entityId ?? null})
        AND (${input.signalReason ?? null}::text IS NULL OR "signalReason" = ${input.signalReason ?? null})
        ${input.role ? Prisma.sql`AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur."roleId" WHERE ur."userId" = asig.user_id AND r.name = ${input.role})` : Prisma.sql``}
      GROUP BY DATE(created_at), "signalReason"
      ORDER BY date ASC, "signalReason"
    `;

    const rows = await prisma.$queryRaw<Array<VolumeRow>>(query);

    return rows.map((row) => ({
      date: row.date,
      signalReason: row.signalReason,
      count: Number(row.count),
    }));
  }

  static async getResolutionVelocity(input: SignalAnalyticsQueryInput) {
    const { from } = rangeToDateRange(input.range);

    const query = Prisma.sql`
      SELECT "signalReason",
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as median_hours
      FROM action_signals asig
      WHERE created_at >= ${from} AND resolved_at IS NOT NULL
        AND (${input.incidentId ?? null}::uuid IS NULL OR incident_id = ${input.incidentId ?? null})
        AND (${input.entityId ?? null}::uuid IS NULL OR entity_id = ${input.entityId ?? null})
        AND (${input.signalReason ?? null}::text IS NULL OR "signalReason" = ${input.signalReason ?? null})
        ${input.role ? Prisma.sql`AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur."roleId" WHERE ur."userId" = asig.user_id AND r.name = ${input.role})` : Prisma.sql``}
      GROUP BY "signalReason"
      ORDER BY median_hours DESC
    `;

    const rows = await prisma.$queryRaw<Array<ResolutionVelocityRow>>(query);

    return rows.map((row) => ({
      signalReason: row.signalReason,
      medianHours: Number(row.median_hours),
    }));
  }

  static async getResolutionRate(input: SignalAnalyticsQueryInput) {
    const { from } = rangeToDateRange(input.range);

    const query = Prisma.sql`
      SELECT "signalReason",
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at <= created_at + INTERVAL '24 hours')::int as within_24h,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at <= created_at + INTERVAL '48 hours')::int as within_48h,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at <= created_at + INTERVAL '7 days')::int as within_1w
      FROM action_signals asig
      WHERE created_at >= ${from}
        AND (${input.incidentId ?? null}::uuid IS NULL OR incident_id = ${input.incidentId ?? null})
        AND (${input.entityId ?? null}::uuid IS NULL OR entity_id = ${input.entityId ?? null})
        AND (${input.signalReason ?? null}::text IS NULL OR "signalReason" = ${input.signalReason ?? null})
        ${input.role ? Prisma.sql`AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur."roleId" WHERE ur."userId" = asig.user_id AND r.name = ${input.role})` : Prisma.sql``}
      GROUP BY "signalReason"
    `;

    const rows = await prisma.$queryRaw<Array<ResolutionRateRow>>(query);

    return rows.map((row) => {
      const total = Number(row.total);
      const within24h = Number(row.within_24h);
      const within48h = Number(row.within_48h);
      const within1w = Number(row.within_1w);

      return {
        signalReason: row.signalReason,
        total,
        within24h,
        within48h,
        within1w,
        rate24h: total > 0 ? Math.round((within24h / total) * 10000) / 100 : 0,
        rate48h: total > 0 ? Math.round((within48h / total) * 10000) / 100 : 0,
        rate1w: total > 0 ? Math.round((within1w / total) * 10000) / 100 : 0,
      };
    });
  }

  static async getPriorityDistribution(input: SignalAnalyticsQueryInput) {
    const where = buildWhere(input);

    if (input.role) {
      where.user = {
        roles: {
          some: {
            role: {
              name: input.role,
            },
          },
        },
      };
    }

    const rows = await prisma.actionSignal.groupBy({
      by: ['signalReason', 'priority'],
      where,
      _count: { id: true },
      orderBy: [{ signalReason: 'asc' }, { priority: 'desc' }],
    });

    return rows.map((row) => ({
      signalReason: row.signalReason,
      priority: row.priority,
      count: row._count.id,
    }));
  }

  static async getRoleEngagement(input: SignalAnalyticsQueryInput) {
    const { from } = rangeToDateRange(input.range);

    const query = Prisma.sql`
      SELECT r.name as role_name,
        COUNT(asig.id)::int as total_signals,
        COUNT(asig.resolved_at)::int as resolved_signals
      FROM action_signals asig
      JOIN user_roles ur ON ur."userId" = asig.user_id
      JOIN roles r ON r.id = ur."roleId"
      WHERE asig.created_at >= ${from}
        AND (${input.incidentId ?? null}::uuid IS NULL OR asig.incident_id = ${input.incidentId ?? null})
        AND (${input.entityId ?? null}::uuid IS NULL OR asig.entity_id = ${input.entityId ?? null})
        AND (${input.signalReason ?? null}::text IS NULL OR asig."signalReason" = ${input.signalReason ?? null})
      GROUP BY r.name
      ORDER BY total_signals DESC
    `;

    const rows = await prisma.$queryRaw<Array<RoleEngagementRow>>(query);

    return rows.map((row) => {
      const totalSignals = Number(row.total_signals);
      const resolvedSignals = Number(row.resolved_signals);

      return {
        role: row.role_name,
        totalSignals,
        resolvedSignals,
        resolutionRate: totalSignals > 0
          ? Math.round((resolvedSignals / totalSignals) * 10000) / 100
          : 0,
      };
    });
  }

  static async getTopEntities(input: SignalAnalyticsQueryInput) {
    const { from } = rangeToDateRange(input.range);

    const query = Prisma.sql`
      SELECT e.id, e.name, e.type,
        COUNT(asig.id)::int as unresolved_count,
        MAX(asig.priority) as highest_priority
      FROM action_signals asig
      JOIN entities e ON e.id = asig.entity_id
      WHERE asig.created_at >= ${from} AND asig.resolved_at IS NULL
        AND (${input.incidentId ?? null}::uuid IS NULL OR asig.incident_id = ${input.incidentId ?? null})
        AND (${input.signalReason ?? null}::text IS NULL OR asig."signalReason" = ${input.signalReason ?? null})
        ${input.role ? Prisma.sql`AND EXISTS (SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.id = ur2."roleId" WHERE ur2."userId" = asig.user_id AND r2.name = ${input.role})` : Prisma.sql``}
      GROUP BY e.id, e.name, e.type
      ORDER BY unresolved_count DESC
      LIMIT 20
    `;

    const rows = await prisma.$queryRaw<Array<TopEntityRow>>(query);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      unresolvedCount: Number(row.unresolved_count),
      highestPriority: resolveHighestPriority(
        row.highest_priority ? [row.highest_priority] : []
      ),
    }));
  }

  static async getFullAnalytics(input: SignalAnalyticsQueryInput) {
    const [
      volumeOverTime,
      resolutionVelocity,
      resolutionRate,
      priorityDistribution,
      topEntities,
      roleEngagement,
    ] = await Promise.all([
      this.getVolumeOverTime(input),
      this.getResolutionVelocity(input),
      this.getResolutionRate(input),
      this.getPriorityDistribution(input),
      this.getTopEntities(input),
      input.role ? Promise.resolve(null) : this.getRoleEngagement(input),
    ]);

    return {
      volumeOverTime,
      resolutionVelocity,
      resolutionRate,
      priorityDistribution,
      topEntities,
      roleEngagement,
    };
  }
}
