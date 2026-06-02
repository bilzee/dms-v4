import { db } from '@/lib/db/client'
import { Priority } from '@prisma/client'

type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

function highestSeverity(a: SeverityLevel | null, b: SeverityLevel): SeverityLevel {
  if (!a) return b
  return SEVERITY_ORDER[b] > SEVERITY_ORDER[a] ? b : a
}

class IncidentSeverityService {

  async computeIncidentSeverity(incidentId: string): Promise<SeverityLevel | null> {
    const [rapidAssessments, preliminaryAssessment] = await Promise.all([
      db.rapidAssessment.findMany({
        where: {
          incidentId,
          verificationStatus: { in: ['VERIFIED', 'AUTO_VERIFIED'] },
        },
        select: { priority: true },
      }),
      db.preliminaryAssessment.findFirst({
        where: { incidentId },
        orderBy: { createdAt: 'desc' },
        select: {
          numberLivesLost: true,
          numberInjured: true,
          numberDisplaced: true,
        },
      }),
    ])

    if (rapidAssessments.length > 0) {
      let max: SeverityLevel | null = null
      for (const ra of rapidAssessments) {
        if (ra.priority && ra.priority !== 'UNCLASSIFIED') {
          max = highestSeverity(max, ra.priority as SeverityLevel)
        }
      }
      if (max) return max
    }

    if (preliminaryAssessment) {
      return this.computePreliminarySeverity(preliminaryAssessment)
    }

    return null
  }

  private async computePreliminarySeverity(data: {
    numberLivesLost: number
    numberInjured: number
    numberDisplaced: number
  }): Promise<SeverityLevel | null> {
    if (data.numberLivesLost === 0 && data.numberInjured === 0 && data.numberDisplaced === 0) {
      return null
    }

    const thresholds = await this.getPreliminaryThresholds()

    for (const t of thresholds.sort((a, b) => SEVERITY_ORDER[b.severityLevel] - SEVERITY_ORDER[a.severityLevel])) {
      const livesMet = t.livesLostMin != null && data.numberLivesLost >= t.livesLostMin
      const injuredMet = t.injuredMin != null && data.numberInjured >= t.injuredMin
      const displacedMet = t.displacedMin != null && data.numberDisplaced >= t.displacedMin
      if (livesMet || injuredMet || displacedMet) {
        return t.severityLevel
      }
    }

    return null
  }

  private async getPreliminaryThresholds(): Promise<Array<{
    severityLevel: SeverityLevel
    livesLostMin?: number | null
    injuredMin?: number | null
    displacedMin?: number | null
  }>> {
    try {
      const stored = await db.systemSetting.findMany({
        where: { section: 'SEVERITY_THRESHOLD' },
      })
      if (stored.length > 0) {
        return stored.map(s => {
          const cfg = s.value as any
          return {
            severityLevel: (cfg?.severityLevel as SeverityLevel) || 'MEDIUM',
            livesLostMin: cfg?.livesLostMin,
            injuredMin: cfg?.injuredMin,
            displacedMin: cfg?.displacedMin,
          }
        })
      }
    } catch {}

    return [
      { severityLevel: 'CRITICAL', livesLostMin: 101, injuredMin: 501, displacedMin: 5001 },
      { severityLevel: 'HIGH', livesLostMin: 11, injuredMin: 51, displacedMin: 501 },
      { severityLevel: 'MEDIUM', livesLostMin: 1, injuredMin: 1, displacedMin: 1 },
    ]
  }

  async recalculateAll(): Promise<{ total: number; results: Array<{ id: string; oldSeverity: Priority; newSeverity: Priority }> }> {
    const incidents = await db.incident.findMany({
      select: { id: true, severity: true },
    })

    const results: Array<{ id: string; oldSeverity: Priority; newSeverity: Priority }> = []

    for (const incident of incidents) {
      const newSeverity = await this.recalculateIncidentSeverity(incident.id)
      if (newSeverity !== incident.severity) {
        results.push({
          id: incident.id,
          oldSeverity: incident.severity,
          newSeverity,
        })
      }
    }

    return { total: incidents.length, results }
  }

  async recalculateIncidentSeverity(incidentId: string): Promise<Priority> {
    const computed = await this.computeIncidentSeverity(incidentId)
    const severity: Priority = computed || 'UNCLASSIFIED'

    await db.incident.update({
      where: { id: incidentId },
      data: { severity },
    })

    return severity
  }
}

export const incidentSeverityService = new IncidentSeverityService()
export default incidentSeverityService
