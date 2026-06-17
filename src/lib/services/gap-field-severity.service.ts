/**
 * Gap Field Severity Service
 * 
 * Dynamic gap field severity management and calculation service.
 * Replaces hardcoded severity logic with database-driven configuration.
 */

import { db } from '@/lib/db/client'
import { AssessmentType, Priority } from '@prisma/client'

export interface GapFieldSeverity {
  id: string
  fieldName: string
  assessmentType: AssessmentType
  severity: Priority
  displayName: string
  description?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy?: string | null
  updatedBy?: string | null
}

export interface GapAnalysisResult {
  hasGap: boolean
  gapFields: string[]
  severity: Priority
  recommendations: string[]
}

/**
 * Cache for gap field severities to avoid repeated database queries
 * Cache expires after 5 minutes
 */
let severityCache: Map<AssessmentType, Map<string, Priority>> = new Map()
let cacheTimestamp: number = 0
const CACHE_DURATION = 30 * 1000 // 30 seconds — short window to avoid stale severities after coordinator updates

class GapFieldSeverityService {
  
  /**
   * Get all gap field severities for a specific assessment type
   */
  async getSeveritiesByAssessmentType(assessmentType: AssessmentType): Promise<GapFieldSeverity[]> {
    try {
      const severities = await db.gapFieldSeverity.findMany({
        where: {
          assessmentType,
          isActive: true
        },
        orderBy: {
          displayName: 'asc'
        }
      })

      return severities
    } catch (error) {
      console.error(`Error fetching severities for ${assessmentType}:`, error)
      throw new Error(`Failed to fetch gap field severities for ${assessmentType}`)
    }
  }

  /**
   * Get all active gap field severities
   */
  async getAllSeverities(): Promise<GapFieldSeverity[]> {
    try {
      const severities = await db.gapFieldSeverity.findMany({
        where: {
          isActive: true
        },
        orderBy: [
          { assessmentType: 'asc' },
          { displayName: 'asc' }
        ]
      })

      return severities
    } catch (error) {
      console.error('Error fetching all gap field severities:', error)
      throw new Error('Failed to fetch gap field severities')
    }
  }

  /**
   * Update a gap field severity
   */
  async updateFieldSeverity(
    id: string, 
    severity: Priority, 
    userId: string
  ): Promise<GapFieldSeverity> {
    try {
      const updated = await db.gapFieldSeverity.update({
        where: { id },
        data: {
          severity,
          updatedBy: userId
        }
      })

      // Clear cache to force refresh
      this.clearCache()

      return updated
    } catch (error) {
      console.error(`Error updating gap field severity ${id}:`, error)
      throw new Error('Failed to update gap field severity')
    }
  }

  /**
   * Get cached or fetch severity mappings for an assessment type
   */
  private async getSeverityMapping(assessmentType: AssessmentType): Promise<Map<string, Priority>> {
    const now = Date.now()
    
    // Check if cache is valid
    if (now - cacheTimestamp < CACHE_DURATION && severityCache.has(assessmentType)) {
      return severityCache.get(assessmentType)!
    }

    // Fetch from database
    const severities = await this.getSeveritiesByAssessmentType(assessmentType)
    const mapping = new Map<string, Priority>()
    
    severities.forEach(severity => {
      mapping.set(severity.fieldName, severity.severity)
    })

    // Update cache
    severityCache.set(assessmentType, mapping)
    cacheTimestamp = now

    return mapping
  }

  /**
   * Calculate assessment severity based on actual gap fields present
   * This is the core function that replaces hardcoded severity logic
   */
  async calculateAssessmentSeverity(
    assessmentType: AssessmentType, 
    gapFields: string[]
  ): Promise<Priority> {
    try {
      if (gapFields.length === 0) {
        return Priority.LOW
      }

      // Get severity mapping for this assessment type
      const severityMapping = await this.getSeverityMapping(assessmentType)
      
      // Find the highest severity among the gap fields
      let highestSeverity = Priority.LOW
      
      for (const fieldName of gapFields) {
        const fieldSeverity = severityMapping.get(fieldName)
        
        if (fieldSeverity) {
          // Compare severities (CRITICAL > HIGH > MEDIUM > LOW)
          if (this.compareSeverities(fieldSeverity, highestSeverity) > 0) {
            highestSeverity = fieldSeverity as any
          }
        }
      }

      return highestSeverity
    } catch (error) {
      console.error(`Error calculating assessment severity for ${assessmentType}:`, error)
      // Fallback to MEDIUM if calculation fails
      return Priority.MEDIUM
    }
  }

  /**
   * Compare two severity levels
   * Returns: 1 if severity1 > severity2, -1 if severity1 < severity2, 0 if equal
   */
  private compareSeverities(severity1: Priority, severity2: Priority): number {
    const severityOrder = {
      [Priority.UNCLASSIFIED]: 0,
      [Priority.LOW]: 1,
      [Priority.MEDIUM]: 2,
      [Priority.HIGH]: 3,
      [Priority.CRITICAL]: 4
    }

    const order1 = severityOrder[severity1]
    const order2 = severityOrder[severity2]

    return order1 - order2
  }

  /**
   * Calculate severity for a specific field
   * Returns the configured severity for the field or default fallback
   */
  async calculateFieldSeverity(
    assessmentType: AssessmentType, 
    fieldName: string
  ): Promise<Priority> {
    try {
      const gapFields = await this.getSeveritiesByAssessmentType(assessmentType)
      
      // Find field directly since field names now match assessment fields
      const fieldConfig = gapFields.find(field => field.fieldName === fieldName)
      
      if (fieldConfig) {
        return fieldConfig.severity
      } else {
        // Return MEDIUM as fallback if field not found
        console.warn(`Field ${fieldName} not found in gap fields for ${assessmentType}`)
        return Priority.MEDIUM
      }
    } catch (error) {
      console.error(`Error calculating field severity for ${fieldName} in ${assessmentType}:`, error)
      // Fallback severity
      return Priority.MEDIUM
    }
  }

  
  /**
   * Clear the severity cache (useful when severities are updated)
   */
  clearCache(): void {
    severityCache.clear()
    cacheTimestamp = 0
  }

  /**
   * Bulk update multiple gap field severities
   */
  async bulkUpdateSeverities(
    updates: Array<{ id: string; severity: Priority }>,
    userId: string
  ): Promise<void> {
    try {
      await db.$transaction(
        updates.map(update => 
          db.gapFieldSeverity.update({
            where: { id: update.id },
            data: {
              severity: update.severity,
              updatedBy: userId
            }
          })
        )
      )

      // Clear cache after bulk update
      this.clearCache()
    } catch (error) {
      console.error('Error performing bulk severity update:', error)
      throw new Error('Failed to update gap field severities')
    }
  }

  /**
   * Get gap field details by field name and assessment type
   */
  async getGapFieldByName(
    fieldName: string, 
    assessmentType: AssessmentType
  ): Promise<GapFieldSeverity | null> {
    try {
      const gapField = await db.gapFieldSeverity.findUnique({
        where: {
          unique_field_assessment: {
            fieldName,
            assessmentType
          }
        }
      })

      return gapField
    } catch (error) {
      console.error(`Error fetching gap field ${fieldName} for ${assessmentType}:`, error)
      return null
    }
  }
}

// Export singleton instance
export const gapFieldSeverityService = new GapFieldSeverityService()
export default gapFieldSeverityService