import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { handleApiError } from '@/lib/api/response'

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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const action = searchParams.get('action')
    const resource = searchParams.get('resource')
    const userId = searchParams.get('userId')
    const search = searchParams.get('search')

    const whereClause: any = {}

    if (startDate || endDate) {
      whereClause.timestamp = {}
      if (startDate) whereClause.timestamp.gte = new Date(startDate)
      if (endDate) whereClause.timestamp.lte = new Date(endDate)
    }
    if (action && action !== 'all') whereClause.action = action
    if (resource && resource !== 'all') whereClause.resource = resource
    if (userId && userId !== 'all') whereClause.userId = userId
    if (search) {
      whereClause.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const auditEntries = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10000,
    })

    const headers = [
      'Timestamp',
      'User Name',
      'User Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'Changes Summary',
    ]

    const csvRows = [
      headers.join(','),
      ...auditEntries.map((entry: any) => {
        const row = [
          `"${entry.timestamp.toISOString()}"`,
          `"${entry.user?.name || 'System'}"`,
          `"${entry.user?.email || ''}"`,
          `"${entry.action}"`,
          `"${entry.resource}"`,
          `"${entry.resourceId || ''}"`,
          `"${entry.ipAddress || ''}"`,
          `"${JSON.stringify({ old: entry.oldValues, new: entry.newValues }).replace(/"/g, '""')}"`,
        ]
        return row.join(',')
      }),
    ]

    const csvContent = csvRows.join('\n')
    const filename = `audit-log-export-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
})
