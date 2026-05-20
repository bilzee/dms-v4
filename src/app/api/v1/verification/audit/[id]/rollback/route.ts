import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { handleApiError } from '@/lib/api/response'

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles } = context

    if (!roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator or Admin role required.' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const auditLogId = segments[segments.indexOf('audit') + 1]

    if (!auditLogId) {
      return NextResponse.json(
        { success: false, error: 'Audit log ID is required' },
        { status: 400 }
      )
    }

    const auditLog = await prisma.auditLog.findUnique({
      where: { id: auditLogId }
    })

    if (!auditLog) {
      return NextResponse.json(
        { success: false, error: 'Audit log entry not found' },
        { status: 404 }
      )
    }

    if (!auditLog.oldValues || Object.keys(auditLog.oldValues).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot rollback: no previous values recorded' },
        { status: 400 }
      )
    }

    const entityName = auditLog.resource
    const entityId = auditLog.resourceId

    if (entityName === 'Entity' && entityId) {
      await prisma.entity.update({
        where: { id: entityId },
        data: auditLog.oldValues as any
      })
    }

    const rollbackLog = await prisma.auditLog.create({
      data: {
        userId: context.userId,
        action: `${auditLog.action}_ROLLBACK`,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        oldValues: auditLog.newValues || {},
        newValues: auditLog.oldValues || {},
        timestamp: new Date(),
        metadata: {
          rollbackOf: auditLogId,
          originalAction: auditLog.action,
          rollbackReason: 'Manual rollback'
        }
      } as any
    })

    return NextResponse.json({
      success: true,
      data: {
        rollbackLogId: rollbackLog.id,
        originalLogId: auditLogId,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId,
        restoredValues: auditLog.oldValues
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
})
