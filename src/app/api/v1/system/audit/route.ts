import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { handleApiError } from '@/lib/api/response'

const auditFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

const ITEMS_PER_PAGE = 50

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles, permissions } = context

    if (!roles.includes('ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin role required.' },
        { status: 403 }
      )
    }

    const hasPermission = permissions.includes('VIEW_AUDIT_LOGS') || permissions.includes('ALL')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'VIEW_AUDIT_LOGS permission required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = auditFiltersSchema.parse(params)

    const page = parseInt(validatedParams.page || '1')
    const pageSize = Math.min(parseInt(validatedParams.pageSize || ITEMS_PER_PAGE.toString()), 100)
    const skip = (page - 1) * pageSize
    const sortBy = validatedParams.sortBy || 'timestamp'
    const sortOrder = validatedParams.sortOrder || 'desc'

    const whereClause: any = {}

    if (validatedParams.startDate) {
      whereClause.timestamp = { ...whereClause.timestamp, gte: new Date(validatedParams.startDate) }
    }
    if (validatedParams.endDate) {
      whereClause.timestamp = { ...whereClause.timestamp, lte: new Date(validatedParams.endDate) }
    }
    if (validatedParams.action && validatedParams.action !== 'all') {
      whereClause.action = validatedParams.action
    }
    if (validatedParams.userId && validatedParams.userId !== 'all') {
      whereClause.userId = validatedParams.userId
    }
    if (validatedParams.resource && validatedParams.resource !== 'all') {
      whereClause.resource = validatedParams.resource
    }
    if (validatedParams.resourceId) {
      whereClause.resourceId = validatedParams.resourceId
    }
    if (validatedParams.search) {
      whereClause.OR = [
        { action: { contains: validatedParams.search, mode: 'insensitive' } },
        { resource: { contains: validatedParams.search, mode: 'insensitive' } },
        { resourceId: { contains: validatedParams.search, mode: 'insensitive' } },
        { user: { name: { contains: validatedParams.search, mode: 'insensitive' } } },
        { user: { email: { contains: validatedParams.search, mode: 'insensitive' } } },
      ]
    }

    const [
      totalCount,
      auditEntries,
      actionBreakdown,
      uniqueUsers,
      availableActions,
      availableResources,
    ] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              roles: {
                include: {
                  role: { select: { name: true } }
                }
              }
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: whereClause,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.findMany({
        where: whereClause,
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),
      prisma.auditLog.groupBy({
        by: ['resource'],
        _count: { resource: true },
        orderBy: { _count: { resource: 'desc' } },
      }),
    ])

    const formattedEntries = auditEntries.map(entry => ({
      id: entry.id,
      userId: entry.userId || 'system',
      userName: entry.user?.name || 'System User',
      userEmail: entry.user?.email || '',
      userRole: entry.user?.roles?.[0]?.role?.name || 'UNKNOWN',
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId || '',
      oldValues: entry.oldValues || {},
      newValues: entry.newValues || {},
      timestamp: entry.timestamp.toISOString(),
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    }))

    const lastActivity = auditEntries.length > 0 ? auditEntries[0].timestamp.toISOString() : null

    return NextResponse.json({
      success: true,
      data: {
        items: formattedEntries,
        pagination: {
          page,
          limit: pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
        summary: {
          totalEntries: totalCount,
          uniqueUsers: uniqueUsers.length,
          actionTypes: actionBreakdown.length,
          lastActivity,
          actionBreakdown: actionBreakdown.map(a => ({
            action: a.action,
            count: a._count.action,
          })),
        },
        filters: {
          availableActions: availableActions.map(a => ({
            action: a.action,
            count: a._count.action,
          })),
          availableResources: availableResources.map(r => ({
            resource: r.resource,
            count: r._count.resource,
          })),
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid filter parameters',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      }, { status: 400 })
    }

    return handleApiError(error)
  }
})
