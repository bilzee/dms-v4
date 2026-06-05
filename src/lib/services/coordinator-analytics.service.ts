import { prisma } from '@/lib/db/client'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

export const CoordinatorAnalyticsQuerySchema = z.object({
  incidentId: z.string().uuid().optional(),
  entityId: z.string().uuid().optional(),
  range: z.enum(['7d', '30d', '90d']).default('7d'),
})

export type CoordinatorAnalyticsQueryInput = z.infer<typeof CoordinatorAnalyticsQuerySchema>

function rangeToFrom(range: '7d' | '30d' | '90d'): Date {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

export class CoordinatorAnalyticsService {

  static async getPipelineFunnel(input: CoordinatorAnalyticsQueryInput) {
    const incidentFilter = input.incidentId
      ? Prisma.sql`AND ra."incidentId" = ${input.incidentId}`
      : Prisma.sql``
    const entityFilter = input.entityId
      ? Prisma.sql`AND ra."entityId" = ${input.entityId}`
      : Prisma.sql``

    const [
      draftRows,
      submittedRows,
      verifiedRows,
      plannedRows,
      responseVerifiedRows,
      deliveredRows,
      deliveryVerifiedRows,
    ] = await Promise.all([
      prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*)::int as cnt FROM rapid_assessments ra
        WHERE ra."verificationStatus" = 'DRAFT' ${incidentFilter} ${entityFilter}`,
      prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*)::int as cnt FROM rapid_assessments ra
        WHERE ra."verificationStatus" = 'SUBMITTED' ${incidentFilter} ${entityFilter}`,
      prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*)::int as cnt FROM rapid_assessments ra
        WHERE ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED') ${incidentFilter} ${entityFilter}`,
      prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(DISTINCT rr.id)::int as cnt FROM rapid_responses rr
        JOIN rapid_assessments ra ON ra.id = rr."assessmentId"
        WHERE 1=1 ${incidentFilter} ${entityFilter}`,
      prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(DISTINCT rr.id)::int as cnt FROM rapid_responses rr
        JOIN rapid_assessments ra ON ra.id = rr."assessmentId"
        WHERE rr."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED') ${incidentFilter} ${entityFilter}`,
      prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(DISTINCT rr.id)::int as cnt FROM rapid_responses rr
        JOIN rapid_assessments ra ON ra.id = rr."assessmentId"
        WHERE rr."deliveryStatus" = 'DELIVERED' ${incidentFilter} ${entityFilter}`,
      prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(DISTINCT rr.id)::int as cnt FROM rapid_responses rr
        JOIN rapid_assessments ra ON ra.id = rr."assessmentId"
        WHERE rr."deliveryStatus" = 'DELIVERED'
          AND rr."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
          ${incidentFilter} ${entityFilter}`,
    ])

    const toNum = (r: Array<{ cnt: bigint }>) => Number(r[0]?.cnt ?? 0)

    return {
      draft: toNum(draftRows),
      submitted: toNum(submittedRows),
      verified: toNum(verifiedRows),
      responsePlanned: toNum(plannedRows),
      responseVerified: toNum(responseVerifiedRows),
      delivered: toNum(deliveredRows),
      deliveryVerified: toNum(deliveryVerifiedRows),
    }
  }

  static async getVerificationThroughput(input: CoordinatorAnalyticsQueryInput) {
    const from = rangeToFrom(input.range)
    const incidentFilter = input.incidentId
      ? Prisma.sql`AND ra."incidentId" = ${input.incidentId}`
      : Prisma.sql``
    const entityFilter = input.entityId
      ? Prisma.sql`AND ra."entityId" = ${input.entityId}`
      : Prisma.sql``

    const turnaroundRows = await prisma.$queryRaw<Array<{ date: Date; avg_hours: number }>>`
      SELECT DATE(ra."verifiedAt") as date,
        AVG(EXTRACT(EPOCH FROM (ra."verifiedAt" - ra."createdAt")) / 3600)::float as avg_hours
      FROM rapid_assessments ra
      WHERE ra."verifiedAt" IS NOT NULL
        AND ra."createdAt" >= ${from}
        AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
        ${incidentFilter} ${entityFilter}
      GROUP BY DATE(ra."verifiedAt")
      ORDER BY date ASC`

    const responseTurnaroundRows = await prisma.$queryRaw<Array<{ date: Date; avg_hours: number }>>`
      SELECT DATE(rr."verifiedAt") as date,
        AVG(EXTRACT(EPOCH FROM (rr."verifiedAt" - rr."createdAt")) / 3600)::float as avg_hours
      FROM rapid_responses rr
      WHERE rr."verifiedAt" IS NOT NULL
        AND rr."createdAt" >= ${from}
        AND rr."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
      GROUP BY DATE(rr."verifiedAt")
      ORDER BY date ASC`

    const distributionRows = await prisma.$queryRaw<Array<{ bucket: string; cnt: bigint }>>`
      SELECT bucket, COUNT(*)::int as cnt FROM (
        SELECT
          CASE
            WHEN EXTRACT(EPOCH FROM (ra."verifiedAt" - ra."createdAt")) / 3600 < 1 THEN '<1h'
            WHEN EXTRACT(EPOCH FROM (ra."verifiedAt" - ra."createdAt")) / 3600 < 2 THEN '1-2h'
            WHEN EXTRACT(EPOCH FROM (ra."verifiedAt" - ra."createdAt")) / 3600 < 4 THEN '2-4h'
            WHEN EXTRACT(EPOCH FROM (ra."verifiedAt" - ra."createdAt")) / 3600 < 8 THEN '4-8h'
            ELSE '>8h'
          END as bucket
        FROM rapid_assessments ra
        WHERE ra."verifiedAt" IS NOT NULL
          AND ra."createdAt" >= ${from}
          AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
          ${incidentFilter} ${entityFilter}
      ) sub
      GROUP BY bucket
      ORDER BY array_position(ARRAY['<1h','1-2h','2-4h','4-8h','>8h'], bucket)`

    return {
      assessmentTurnaround: turnaroundRows.map(r => ({
        date: r.date,
        avgHours: Number(r.avg_hours),
      })),
      responseTurnaround: responseTurnaroundRows.map(r => ({
        date: r.date,
        avgHours: Number(r.avg_hours),
      })),
      distribution: distributionRows.map(r => ({
        bucket: r.bucket,
        count: Number(r.cnt),
      })),
    }
  }

  static async getPopulationImpact(input: CoordinatorAnalyticsQueryInput) {
    const incidentFilter = input.incidentId
      ? Prisma.sql`AND pa."incidentId" = ${input.incidentId}`
      : Prisma.sql``

    const trendRows = await prisma.$queryRaw<Array<{
      date: Date
      displaced: bigint
      injured: bigint
      lives_lost: bigint
    }>>`
      SELECT DATE(pa."reportingDate") as date,
        SUM(pa."numberDisplaced")::int as displaced,
        SUM(pa."numberInjured")::int as injured,
        SUM(pa."numberLivesLost")::int as lives_lost
      FROM preliminary_assessments pa
      WHERE 1=1 ${incidentFilter}
      GROUP BY DATE(pa."reportingDate")
      ORDER BY date ASC`

    const vulnerableRows = await prisma.$queryRaw<Array<{
      total_population: bigint
      total_households: bigint
      population_male: bigint
      population_female: bigint
      population_under5: bigint
      pregnant_women: bigint
      lactating_mothers: bigint
      person_with_disability: bigint
      elderly_persons: bigint
      separated_children: bigint
    }>>`
      SELECT
        COALESCE(SUM(pop."totalPopulation"), 0)::int as total_population,
        COALESCE(SUM(pop."totalHouseholds"), 0)::int as total_households,
        COALESCE(SUM(pop."populationMale"), 0)::int as population_male,
        COALESCE(SUM(pop."populationFemale"), 0)::int as population_female,
        COALESCE(SUM(pop."populationUnder5"), 0)::int as population_under5,
        COALESCE(SUM(pop."pregnantWomen"), 0)::int as pregnant_women,
        COALESCE(SUM(pop."lactatingMothers"), 0)::int as lactating_mothers,
        COALESCE(SUM(pop."personWithDisability"), 0)::int as person_with_disability,
        COALESCE(SUM(pop."elderlyPersons"), 0)::int as elderly_persons,
        COALESCE(SUM(pop."separatedChildren"), 0)::int as separated_children
      FROM population_assessments pop
      JOIN rapid_assessments ra ON ra.id = pop."rapidAssessmentId"
      WHERE 1=1 ${incidentFilter}
        ${input.entityId ? Prisma.sql`AND ra."entityId" = ${input.entityId}` : Prisma.sql``}`

    const v = vulnerableRows[0]
    const toNum = (val: bigint | undefined) => Number(val ?? 0)

    return {
      trend: trendRows.map(r => ({
        date: r.date,
        displaced: Number(r.displaced),
        injured: Number(r.injured),
        livesLost: Number(r.lives_lost),
      })),
      demographics: {
        totalPopulation: toNum(v?.total_population),
        totalHouseholds: toNum(v?.total_households),
        populationMale: toNum(v?.population_male),
        populationFemale: toNum(v?.population_female),
        populationUnder5: toNum(v?.population_under5),
        pregnantWomen: toNum(v?.pregnant_women),
        lactatingMothers: toNum(v?.lactating_mothers),
        personWithDisability: toNum(v?.person_with_disability),
        elderlyPersons: toNum(v?.elderly_persons),
        separatedChildren: toNum(v?.separated_children),
      },
    }
  }

  static async getResourcePipeline(input: CoordinatorAnalyticsQueryInput) {
    const incidentFilter = input.incidentId
      ? Prisma.sql`AND dc."incidentId" = ${input.incidentId}`
      : Prisma.sql``
    const entityFilter = input.entityId
      ? Prisma.sql`AND dc."entityId" = ${input.entityId}`
      : Prisma.sql``

    const commitmentRows = await prisma.$queryRaw<Array<{
      status: string
      total_committed: bigint
      total_delivered: bigint
      total_verified: bigint
    }>>`
      SELECT dc.status,
        SUM(dc."totalCommittedQuantity")::int as total_committed,
        SUM(dc."deliveredQuantity")::int as total_delivered,
        SUM(dc."verifiedDeliveredQuantity")::int as total_verified
      FROM donor_commitments dc
      WHERE 1=1 ${incidentFilter} ${entityFilter}
      GROUP BY dc.status`

    const typeBreakdown = await prisma.$queryRaw<Array<{
      type: string
      total_committed: bigint
      total_delivered: bigint
    }>>`
      SELECT dc.type,
        SUM(dc."totalCommittedQuantity")::int as total_committed,
        SUM(dc."deliveredQuantity")::int as total_delivered
      FROM donor_commitments dc
      WHERE 1=1 ${incidentFilter} ${entityFilter}
      GROUP BY dc.type`

    const countRow = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(*)::int as cnt FROM donor_commitments dc
      WHERE 1=1 ${incidentFilter} ${entityFilter}`

    return {
      totalCommitments: Number(countRow[0]?.cnt ?? 0),
      byStatus: commitmentRows.map(r => ({
        status: r.status,
        totalCommitted: Number(r.total_committed),
        totalDelivered: Number(r.total_delivered),
        totalVerified: Number(r.total_verified),
      })),
      byType: typeBreakdown.map(r => ({
        type: r.type,
        totalCommitted: Number(r.total_committed),
        totalDelivered: Number(r.total_delivered),
      })),
    }
  }

  static async getWorkloadDistribution(input: CoordinatorAnalyticsQueryInput) {
    const from = rangeToFrom(input.range)
    const incidentFilter = input.incidentId
      ? Prisma.sql`AND ra."incidentId" = ${input.incidentId}`
      : Prisma.sql``

    const assessorRows = await prisma.$queryRaw<Array<{
      user_id: string
      user_name: string
      active_assignments: bigint
      assessments_completed: bigint
      assessments_pending: bigint
    }>>`
      SELECT u.id as user_id, u.name as user_name,
        (SELECT COUNT(*)::int FROM entity_assignments ea WHERE ea."userId" = u.id) as active_assignments,
        (SELECT COUNT(*)::int FROM rapid_assessments ra2 WHERE ra2."assessorId" = u.id
          AND ra2."verificationStatus" IN ('VERIFIED','AUTO_VERIFIED')
          AND ra2."createdAt" >= ${from} ${incidentFilter}) as assessments_completed,
        (SELECT COUNT(*)::int FROM rapid_assessments ra3 WHERE ra3."assessorId" = u.id
          AND ra3."verificationStatus" IN ('DRAFT','SUBMITTED')
          AND ra3."createdAt" >= ${from} ${incidentFilter}) as assessments_pending
      FROM users u
      JOIN user_roles ur ON ur."userId" = u.id
      JOIN roles r ON r.id = ur."roleId" AND r.name = 'ASSESSOR'
      WHERE u."isActive" = true
      ORDER BY assessments_pending DESC`

    const responderRows = await prisma.$queryRaw<Array<{
      user_id: string
      user_name: string
      active_assignments: bigint
      responses_completed: bigint
      responses_pending: bigint
    }>>`
      SELECT u.id as user_id, u.name as user_name,
        (SELECT COUNT(*)::int FROM entity_assignments ea WHERE ea."userId" = u.id) as active_assignments,
        (SELECT COUNT(*)::int FROM rapid_responses rr WHERE rr."responderId" = u.id
          AND rr."deliveryStatus" = 'DELIVERED'
          AND rr."createdAt" >= ${from}) as responses_completed,
        (SELECT COUNT(*)::int FROM rapid_responses rr2 WHERE rr2."responderId" = u.id
          AND rr2."deliveryStatus" = 'PLANNED'
          AND rr2."createdAt" >= ${from}) as responses_pending
      FROM users u
      JOIN user_roles ur ON ur."userId" = u.id
      JOIN roles r ON r.id = ur."roleId" AND r.name = 'RESPONDER'
      WHERE u."isActive" = true
      ORDER BY responses_pending DESC`

    return {
      assessors: assessorRows.map(r => ({
        userId: r.user_id,
        userName: r.user_name,
        activeAssignments: Number(r.active_assignments),
        completed: Number(r.assessments_completed),
        pending: Number(r.assessments_pending),
      })),
      responders: responderRows.map(r => ({
        userId: r.user_id,
        userName: r.user_name,
        activeAssignments: Number(r.active_assignments),
        completed: Number(r.responses_completed),
        pending: Number(r.responses_pending),
      })),
    }
  }

  static async getAssessmentFreshness(input: CoordinatorAnalyticsQueryInput) {
    const incidentFilter = input.incidentId
      ? Prisma.sql`AND ra."incidentId" = ${input.incidentId}`
      : Prisma.sql``

    const rows = await prisma.$queryRaw<Array<{
      entity_id: string
      entity_name: string
      entity_type: string
      assessment_type: string
      last_assessed: Date | null
      hours_ago: number | null
    }>>`
      SELECT e.id as entity_id, e.name as entity_name, e.type as entity_type,
        atype.assessment_type,
        MAX(ra."createdAt") as last_assessed,
        EXTRACT(EPOCH FROM (NOW() - MAX(ra."createdAt"))) / 3600 as hours_ago
      FROM entities e
      CROSS JOIN (VALUES ('HEALTH'::"AssessmentType"),('WASH'::"AssessmentType"),('SHELTER'::"AssessmentType"),('FOOD'::"AssessmentType"),('SECURITY'::"AssessmentType"),('POPULATION'::"AssessmentType")) as atype(assessment_type)
      LEFT JOIN rapid_assessments ra ON ra."entityId" = e.id
        AND ra."rapidAssessmentType" = atype.assessment_type
        AND ra."verificationStatus" IN ('VERIFIED','AUTO_VERIFIED','SUBMITTED')
        ${incidentFilter}
      WHERE e."isActive" = true
        ${input.entityId ? Prisma.sql`AND e.id = ${input.entityId}` : Prisma.sql``}
      GROUP BY e.id, e.name, e.type, atype.assessment_type
      ORDER BY e.name, atype.assessment_type`

    return rows.map(r => ({
      entityId: r.entity_id,
      entityName: r.entity_name,
      entityType: r.entity_type,
      assessmentType: r.assessment_type,
      lastAssessed: r.last_assessed,
      hoursAgo: r.hours_ago !== null ? Number(r.hours_ago) : null,
    }))
  }

  static async getGapRadar(input: CoordinatorAnalyticsQueryInput) {
    const incidentFilter = input.incidentId
      ? Prisma.sql`AND ra."incidentId" = ${input.incidentId}`
      : Prisma.sql``
    const entityFilter = input.entityId
      ? Prisma.sql`AND ra."entityId" = ${input.entityId}`
      : Prisma.sql``

    const rows = await prisma.$queryRaw<Array<{
      assessment_type: string
      total_gaps: bigint
      total_fields: bigint
    }>>`
      SELECT ra."rapidAssessmentType" as assessment_type,
        COUNT(*) FILTER (WHERE ra."gapAnalysis" IS NOT NULL
          AND (ra."gapAnalysis"::text != 'null' AND ra."gapAnalysis"::text != '{}'))::int as total_gaps,
        COUNT(*)::int as total_fields
      FROM rapid_assessments ra
      WHERE ra."verificationStatus" IN ('VERIFIED','AUTO_VERIFIED','SUBMITTED')
        ${incidentFilter} ${entityFilter}
      GROUP BY ra."rapidAssessmentType"`

    const gapFieldCounts = await prisma.$queryRaw<Array<{
      entity_id: string
      entity_name: string
      assessment_type: string
      gap_count: number
    }>>`
      WITH latest_assessments AS (
        SELECT DISTINCT ON (ra."entityId", ra."rapidAssessmentType")
          ra.id, ra."entityId", ra."rapidAssessmentType", ra."gapAnalysis"
        FROM rapid_assessments ra
        WHERE ra."verificationStatus" IN ('VERIFIED','AUTO_VERIFIED','SUBMITTED')
          ${incidentFilter} ${entityFilter}
        ORDER BY ra."entityId", ra."rapidAssessmentType", ra."createdAt" DESC
      )
      SELECT la."entityId" as entity_id, e.name as entity_name, la."rapidAssessmentType" as assessment_type,
        CASE
          WHEN la."gapAnalysis" IS NULL OR la."gapAnalysis"::text IN ('null','{}') THEN 0
          ELSE (SELECT COUNT(*)::int FROM jsonb_object_keys(la."gapAnalysis") k)
        END as gap_count
      FROM latest_assessments la
      JOIN entities e ON e.id = la."entityId"
      ORDER BY e.name, la."rapidAssessmentType"`

    return {
      summary: rows.map(r => ({
        assessmentType: r.assessment_type,
        totalGaps: Number(r.total_gaps),
        totalAssessments: Number(r.total_fields),
      })),
      entityGaps: gapFieldCounts.map(r => ({
        entityId: r.entity_id,
        entityName: r.entity_name,
        assessmentType: r.assessment_type,
        gapCount: Number(r.gap_count),
      })),
    }
  }

  static async getLivePulse(input: CoordinatorAnalyticsQueryInput) {
    const incidentFilter = input.incidentId
      ? Prisma.sql`AND i.id = ${input.incidentId}`
      : Prisma.sql``

    const severityRows = await prisma.$queryRaw<Array<{
      date: Date
      severity: string
      name: string
      type: string
    }>>`
      SELECT DATE(i."updatedAt") as date, i.severity, i.name, i.type
      FROM incidents i
      WHERE i.status = 'ACTIVE'
        ${incidentFilter}
      ORDER BY i."updatedAt" DESC`

    const alertCounts = await prisma.$queryRaw<Array<{
      priority: string
      cnt: bigint
    }>>`
      SELECT asig.priority, COUNT(*)::int as cnt
      FROM action_signals asig
      WHERE asig.resolved_at IS NULL
        ${input.incidentId ? Prisma.sql`AND asig.incident_id = ${input.incidentId}` : Prisma.sql``}
      GROUP BY asig.priority`

    const recentEvents = await prisma.$queryRaw<Array<{
      id: string
      event_type: string
      description: string
      created_at: Date
      priority: string | null
    }>>`
      (SELECT ra.id, 'ASSESSMENT_CREATED' as event_type,
        CONCAT('Assessment created for ', e.name) as description,
        ra."createdAt" as created_at, ra.priority::text
       FROM rapid_assessments ra
       JOIN entities e ON e.id = ra."entityId"
       WHERE ra."createdAt" >= NOW() - INTERVAL '24 hours'
       ORDER BY ra."createdAt" DESC LIMIT 5)
      UNION ALL
      (SELECT rr.id, 'RESPONSE_DELIVERED' as event_type,
        CONCAT('Response delivered for ', e.name) as description,
        rr."createdAt" as created_at, rr.priority::text
       FROM rapid_responses rr
       JOIN entities e ON e.id = rr."entityId"
       WHERE rr."deliveryStatus" = 'DELIVERED'
         AND rr."createdAt" >= NOW() - INTERVAL '24 hours'
       ORDER BY rr."createdAt" DESC LIMIT 5)
      UNION ALL
      (SELECT asig.id, 'SIGNAL_' || asig."signalReason" as event_type,
        CONCAT(asig."signalReason", ' - ', e.name) as description,
        asig.created_at, asig.priority
       FROM action_signals asig
       JOIN entities e ON e.id = asig.entity_id
       WHERE asig.resolved_at IS NULL
         AND asig.created_at >= NOW() - INTERVAL '24 hours'
       ORDER BY asig.created_at DESC LIMIT 5)
      ORDER BY created_at DESC LIMIT 10`

    return {
      severityTimeline: severityRows.map(r => ({
        date: r.date,
        severity: r.severity,
        name: r.name,
        type: r.type,
      })),
      alertCounts: alertCounts.map(r => ({
        priority: r.priority,
        count: Number(r.cnt),
      })),
      recentEvents: recentEvents.map(r => ({
        id: r.id,
        eventType: r.event_type,
        description: r.description,
        createdAt: r.created_at,
        priority: r.priority,
      })),
    }
  }

  static async getAfterAction(input: CoordinatorAnalyticsQueryInput) {
    const incidentFilter = input.incidentId
      ? Prisma.sql`AND i.id = ${input.incidentId}`
      : Prisma.sql``

    const pipelineTiming = await prisma.$queryRaw<Array<{
      incident_id: string
      incident_name: string
      incident_type: string
      time_to_first_assessment_hours: number | null
      time_to_first_verification_hours: number | null
      time_to_first_response_hours: number | null
      time_to_first_delivery_hours: number | null
    }>>`
      SELECT i.id as incident_id, i.name as incident_name, i.type as incident_type,
        EXTRACT(EPOCH FROM (
          (SELECT MIN(ra."createdAt") FROM rapid_assessments ra WHERE ra."incidentId" = i.id) - i."createdAt"
        )) / 3600 as time_to_first_assessment_hours,
        EXTRACT(EPOCH FROM (
          (SELECT MIN(ra."verifiedAt") FROM rapid_assessments ra WHERE ra."incidentId" = i.id
            AND ra."verificationStatus" IN ('VERIFIED','AUTO_VERIFIED')) - i."createdAt"
        )) / 3600 as time_to_first_verification_hours,
        EXTRACT(EPOCH FROM (
          (SELECT MIN(rr."createdAt") FROM rapid_responses rr
            JOIN rapid_assessments ra ON ra.id = rr."assessmentId"
            WHERE ra."incidentId" = i.id) - i."createdAt"
        )) / 3600 as time_to_first_response_hours,
        EXTRACT(EPOCH FROM (
          (SELECT MIN(rr."responseDate") FROM rapid_responses rr
            JOIN rapid_assessments ra ON ra.id = rr."assessmentId"
            WHERE ra."incidentId" = i.id AND rr."deliveryStatus" = 'DELIVERED') - i."createdAt"
        )) / 3600 as time_to_first_delivery_hours
      FROM incidents i
      WHERE 1=1 ${incidentFilter}
      ORDER BY i."createdAt" DESC`

    const rejectionAnalysis = await prisma.$queryRaw<Array<{
      rejection_reason: string
      cnt: bigint
    }>>`
      SELECT COALESCE(ra."rejectionReason", 'OTHER') as rejection_reason, COUNT(*)::int as cnt
      FROM rapid_assessments ra
      WHERE ra."verificationStatus" = 'REJECTED'
        AND ra."createdAt" >= ${rangeToFrom(input.range)}
        ${input.incidentId ? Prisma.sql`AND ra."incidentId" = ${input.incidentId}` : Prisma.sql``}
      GROUP BY ra."rejectionReason"
      ORDER BY cnt DESC`

    const assessorRejection = await prisma.$queryRaw<Array<{
      assessor_id: string
      assessor_name: string
      total: bigint
      rejected: bigint
    }>>`
      SELECT u.id as assessor_id, u.name as assessor_name,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE ra."verificationStatus" = 'REJECTED')::int as rejected
      FROM rapid_assessments ra
      JOIN users u ON u.id = ra."assessorId"
      WHERE ra."createdAt" >= ${rangeToFrom(input.range)}
        ${input.incidentId ? Prisma.sql`AND ra."incidentId" = ${input.incidentId}` : Prisma.sql``}
      GROUP BY u.id, u.name
      HAVING COUNT(*) FILTER (WHERE ra."verificationStatus" = 'REJECTED') > 0
      ORDER BY rejected DESC`

    const donorReliability = await prisma.$queryRaw<Array<{
      donor_id: string
      donor_name: string
      donor_type: string
      total_committed: bigint
      total_delivered: bigint
      total_verified: bigint
      total_commitments: bigint
      completed_commitments: bigint
    }>>`
      SELECT d.id as donor_id, d.name as donor_name, d.type as donor_type,
        SUM(dc."totalCommittedQuantity")::int as total_committed,
        SUM(dc."deliveredQuantity")::int as total_delivered,
        SUM(dc."verifiedDeliveredQuantity")::int as total_verified,
        COUNT(dc.id)::int as total_commitments,
        COUNT(*) FILTER (WHERE dc.status = 'COMPLETE')::int as completed_commitments
      FROM donors d
      JOIN donor_commitments dc ON dc."donorId" = d.id
      WHERE 1=1 ${input.incidentId ? Prisma.sql`AND dc."incidentId" = ${input.incidentId}` : Prisma.sql``}
      GROUP BY d.id, d.name, d.type
      HAVING SUM(dc."totalCommittedQuantity") > 0
      ORDER BY total_committed DESC`

    const incidentComparison = await prisma.$queryRaw<Array<{
      incident_id: string
      incident_name: string
      incident_type: string
      severity: string
      status: string
      total_assessments: bigint
      total_responses: bigint
      total_commitments: bigint
      population_affected: bigint
    }>>`
      SELECT i.id as incident_id, i.name as incident_name, i.type as incident_type,
        i.severity, i.status,
        (SELECT COUNT(*)::int FROM rapid_assessments ra WHERE ra."incidentId" = i.id) as total_assessments,
        (SELECT COUNT(*)::int FROM rapid_responses rr
          JOIN rapid_assessments ra ON ra.id = rr."assessmentId" WHERE ra."incidentId" = i.id) as total_responses,
        (SELECT COALESCE(SUM(dc."totalCommittedQuantity"), 0)::int
          FROM donor_commitments dc WHERE dc."incidentId" = i.id) as total_commitments,
        (SELECT COALESCE(SUM(pop."totalPopulation"), 0)::int
          FROM population_assessments pop
          JOIN rapid_assessments ra ON ra.id = pop."rapidAssessmentId"
          WHERE ra."incidentId" = i.id) as population_affected
      FROM incidents i
      ORDER BY i."createdAt" DESC
      LIMIT 10`

    return {
      pipelineTiming: pipelineTiming.map(r => ({
        incidentId: r.incident_id,
        incidentName: r.incident_name,
        incidentType: r.incident_type,
        timeToFirstAssessment: r.time_to_first_assessment_hours !== null ? Number(r.time_to_first_assessment_hours) : null,
        timeToFirstVerification: r.time_to_first_verification_hours !== null ? Number(r.time_to_first_verification_hours) : null,
        timeToFirstResponse: r.time_to_first_response_hours !== null ? Number(r.time_to_first_response_hours) : null,
        timeToFirstDelivery: r.time_to_first_delivery_hours !== null ? Number(r.time_to_first_delivery_hours) : null,
      })),
      rejectionAnalysis: rejectionAnalysis.map(r => ({
        reason: r.rejection_reason,
        count: Number(r.cnt),
      })),
      assessorRejection: assessorRejection.map(r => ({
        assessorId: r.assessor_id,
        assessorName: r.assessor_name,
        total: Number(r.total),
        rejected: Number(r.rejected),
        rejectionRate: Number(r.total) > 0
          ? Math.round((Number(r.rejected) / Number(r.total)) * 10000) / 100
          : 0,
      })),
      donorReliability: donorReliability.map(r => ({
        donorId: r.donor_id,
        donorName: r.donor_name,
        donorType: r.donor_type,
        totalCommitted: Number(r.total_committed),
        totalDelivered: Number(r.total_delivered),
        totalVerified: Number(r.total_verified),
        totalCommitments: Number(r.total_commitments),
        completedCommitments: Number(r.completed_commitments),
        deliveryRate: Number(r.total_committed) > 0
          ? Math.round((Number(r.total_delivered) / Number(r.total_committed)) * 10000) / 100
          : 0,
      })),
      incidentComparison: incidentComparison.map(r => ({
        incidentId: r.incident_id,
        incidentName: r.incident_name,
        incidentType: r.incident_type,
        severity: r.severity,
        status: r.status,
        totalAssessments: Number(r.total_assessments),
        totalResponses: Number(r.total_responses),
        totalCommitments: Number(r.total_commitments),
        populationAffected: Number(r.population_affected),
      })),
    }
  }

  private static withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms)
      ),
    ]).catch(() => fallback)
  }

  static async getFullAnalytics(input: CoordinatorAnalyticsQueryInput) {
    const emptyPipeline = { draft: 0, submitted: 0, verified: 0, responsePlanned: 0, responseVerified: 0, delivered: 0, deliveryVerified: 0 }
    const emptyThroughput = { assessmentTurnaround: [], responseTurnaround: [], distribution: [] }
    const emptyPopulation = { trend: [], demographics: { totalPopulation: 0, totalHouseholds: 0, populationMale: 0, populationFemale: 0, populationUnder5: 0, pregnantWomen: 0, lactatingMothers: 0, personWithDisability: 0, elderlyPersons: 0, separatedChildren: 0 } }
    const emptyResources = { totalCommitments: 0, byStatus: [], byType: [] }
    const emptyWorkload = { assessors: [], responders: [] }
    const emptyFreshness: any[] = []
    const emptyGapRadar = { summary: [], entityGaps: [] }
    const emptyLivePulse = { severityTimeline: [], alertCounts: [], recentEvents: [] }
    const emptyAfterAction = { pipelineTiming: [], rejectionAnalysis: [], assessorRejection: [], donorReliability: [], incidentComparison: [] }

    const pipeline = await this.withTimeout(this.getPipelineFunnel(input), 10000, emptyPipeline)
    const throughput = await this.withTimeout(this.getVerificationThroughput(input), 10000, emptyThroughput)
    const population = await this.withTimeout(this.getPopulationImpact(input), 10000, emptyPopulation)
    const resources = await this.withTimeout(this.getResourcePipeline(input), 10000, emptyResources)
    const workload = await this.withTimeout(this.getWorkloadDistribution(input), 10000, emptyWorkload)
    const freshness = await this.withTimeout(this.getAssessmentFreshness(input), 10000, emptyFreshness)
    const gapRadar = await this.withTimeout(this.getGapRadar(input), 10000, emptyGapRadar)
    const livePulse = await this.withTimeout(this.getLivePulse(input), 10000, emptyLivePulse)
    const afterAction = await this.withTimeout(this.getAfterAction(input), 10000, emptyAfterAction)

    return {
      pipeline,
      throughput,
      population,
      resources,
      workload,
      freshness,
      gapRadar,
      livePulse,
      afterAction,
    }
  }
}
