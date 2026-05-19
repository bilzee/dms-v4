import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

function getDateRangeFilter(dateRange: string): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  switch (dateRange) {
    case '7d': start.setDate(end.getDate() - 7); break
    case '30d': start.setDate(end.getDate() - 30); break
    case '90d': start.setDate(end.getDate() - 90); break
    case '1y': start.setFullYear(end.getFullYear() - 1); break
    default: start.setDate(end.getDate() - 30)
  }
  return { start, end }
}

function escapeCSV(value: any): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const isAdmin = context.roles.includes('ADMIN')
    if (!context.roles.includes('DONOR') && !isAdmin) {
      return NextResponse.json(
        { error: 'Donor role required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { format, includeCharts, includeTrends, includeGapAnalysis, dateRange, entityIds } = body

    const { start, end } = getDateRangeFilter(dateRange || '30d')

    let filteredEntityIds: string[] = []
    if (isAdmin) {
      filteredEntityIds = entityIds?.length > 0 ? entityIds : []
    } else {
      const assignedEntityIds = await prisma.entityAssignment.findMany({
        where: { userId: context.userId },
        select: { entityId: true }
      })
      const accessibleEntityIds = assignedEntityIds.map(a => a.entityId)
      filteredEntityIds = entityIds?.length > 0
        ? entityIds.filter((id: string) => accessibleEntityIds.includes(id))
        : accessibleEntityIds
    }

    if (filteredEntityIds.length === 0 && !isAdmin) {
      return NextResponse.json(
        { error: 'No accessible entities found' },
        { status: 404 }
      )
    }

    const entities = await prisma.entity.findMany({
      where: {
        id: { in: filteredEntityIds },
        isActive: true
      },
      include: {
        rapidAssessments: {
          where: { createdAt: { gte: start, lte: end } },
          select: {
            id: true,
            verificationStatus: true,
            status: true,
            priority: true,
            createdAt: true,
            rapidAssessmentType: true
          }
        },
        responses: {
          where: { createdAt: { gte: start, lte: end } },
          select: {
            id: true,
            status: true,
            priority: true,
            createdAt: true,
            type: true
          }
        },
        commitments: {
          where: { commitmentDate: { gte: start, lte: end } },
          select: {
            id: true,
            status: true,
            totalCommittedQuantity: true,
            deliveredQuantity: true,
            verifiedDeliveredQuantity: true,
            totalValueEstimated: true,
            commitmentDate: true
          }
        }
      }
    })

    const reportData = {
      title: 'Donor Impact Report',
      generatedAt: new Date().toISOString(),
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        totalEntities: entities.length,
        totalAssessments: entities.reduce((sum, e) => sum + e.rapidAssessments.length, 0),
        totalResponses: entities.reduce((sum, e) => sum + e.responses.length, 0),
        totalCommitments: entities.reduce((sum, e) => sum + e.commitments.length, 0),
        totalCommittedQuantity: entities.reduce((sum, e) =>
          sum + e.commitments.reduce((cs, c) => cs + c.totalCommittedQuantity, 0), 0),
        totalDeliveredQuantity: entities.reduce((sum, e) =>
          sum + e.commitments.reduce((cs, c) => cs + c.deliveredQuantity, 0), 0),
        totalVerifiedQuantity: entities.reduce((sum, e) =>
          sum + e.commitments.reduce((cs, c) => cs + c.verifiedDeliveredQuantity, 0), 0)
      },
      entities: entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        location: entity.location,
        assessments: entity.rapidAssessments.length,
        responses: entity.responses.length,
        commitments: entity.commitments.length,
        committedQuantity: entity.commitments.reduce((sum, c) => sum + c.totalCommittedQuantity, 0),
        deliveredQuantity: entity.commitments.reduce((sum, c) => sum + c.deliveredQuantity, 0),
        verifiedQuantity: entity.commitments.reduce((sum, c) => sum + c.verifiedDeliveredQuantity, 0),
        estimatedValue: entity.commitments.reduce((sum, c) => sum + (c.totalValueEstimated || 0), 0)
      }))
    }

    const requestedFormat = format || 'json'

    if (requestedFormat === 'csv') {
      const headers = [
        'Entity Name', 'Entity Type', 'Location',
        'Assessments', 'Responses', 'Commitments',
        'Committed Qty', 'Delivered Qty', 'Verified Qty', 'Estimated Value'
      ]
      const rows = reportData.entities.map(e => [
        e.name, e.type, e.location || '',
        e.assessments, e.responses, e.commitments,
        e.committedQuantity, e.deliveredQuantity, e.verifiedQuantity, e.estimatedValue
      ])
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="donor-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return new NextResponse(JSON.stringify(reportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="donor-report-${new Date().toISOString().split('T')[0]}.json"`
      }
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
