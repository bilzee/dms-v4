import { db } from '@/lib/db/client'

export interface AuditLogEntry {
  id: string
  userId: string | null
  action: string
  resource: string
  resourceId: string | null
  oldValues: any
  newValues: any
  ipAddress: string | null
  userAgent: string | null
  timestamp: Date
}

export interface AuditLogCreateParams {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
}

export interface IAuditLogService {
  logAction(params: AuditLogCreateParams): Promise<void>
  getAuditHistory(resource: string, resourceId: string, limit?: number): Promise<AuditLogEntry[]>
  getUserAuditHistory(userId: string, limit?: number): Promise<AuditLogEntry[]>
}

class AuditLogServiceImpl implements IAuditLogService {
  async logAction(params: AuditLogCreateParams): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          oldValues: params.oldValues,
          newValues: params.newValues,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          timestamp: new Date()
        }
      })
    } catch (error) {
      console.error('Failed to log audit action:', error)
    }
  }

  async getAuditHistory(resource: string, resourceId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    try {
      return await db.auditLog.findMany({
        where: { resource, resourceId },
        orderBy: { timestamp: 'desc' },
        take: limit
      })
    } catch (error) {
      console.error('Failed to get audit history:', error)
      return []
    }
  }

  async getUserAuditHistory(userId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    try {
      return await db.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit
      })
    } catch (error) {
      console.error('Failed to get user audit history:', error)
      return []
    }
  }
}

export const auditLogService = new AuditLogServiceImpl()
