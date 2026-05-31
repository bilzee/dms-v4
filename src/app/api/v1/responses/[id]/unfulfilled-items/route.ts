import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response'
import { prisma } from '@/lib/db/client'

export const GET = withAuth(async (request: NextRequest, context, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { roles } = context
    if (!roles.includes('DONOR') && !roles.includes('COORDINATOR') && !roles.includes('ADMIN')) {
      return errorResponse('Insufficient permissions', 403)
    }

    const { id } = await params
    if (!id) {
      return errorResponse('Response ID is required', 400)
    }

    const response = await prisma.rapidResponse.findUnique({
      where: { id },
      include: {
        entity: { select: { id: true, name: true, type: true } },
        planCommitments: {
          include: {
            commitment: {
              select: {
                id: true,
                status: true,
                items: true,
                donor: { select: { id: true, name: true } },
              }
            }
          }
        }
      }
    })

    if (!response) {
      return errorResponse('Response plan not found', 404)
    }

    const planItems: { name: string; unit: string; quantity: number; estimatedValue?: number }[] =
      Array.isArray(response.items) ? response.items as any : []

    const committedByItem: Record<string, number> = {}
    const existingCommitments: { id: string; donorName: string; items: any[]; status: string }[] = []

    for (const pc of response.planCommitments) {
      const commitment = pc.commitment
      if (commitment.status === 'CANCELLED') continue

      existingCommitments.push({
        id: commitment.id,
        donorName: (commitment.donor as any)?.name || 'Unknown Donor',
        items: Array.isArray(commitment.items) ? commitment.items as any[] : [],
        status: commitment.status,
      })

      const cItems = Array.isArray(commitment.items) ? commitment.items as any[] : []
      for (const item of cItems) {
        const key = `${(item.name || '').toLowerCase()}-${(item.unit || '').toLowerCase()}`
        committedByItem[key] = (committedByItem[key] || 0) + (item.quantity || 0)
      }
    }

    const unfulfilledItems = planItems.map(item => {
      const key = `${(item.name || '').toLowerCase()}-${(item.unit || '').toLowerCase()}`
      const committed = committedByItem[key] || 0
      const remaining = Math.max(0, item.quantity - committed)
      return {
        name: item.name,
        unit: item.unit,
        plannedQuantity: item.quantity,
        committedQuantity: committed,
        remainingQuantity: remaining,
        estimatedValue: item.estimatedValue,
      }
    }).filter(item => item.remainingQuantity > 0)

    return successResponse({
      responseId: response.id,
      entityId: response.entityId,
      entity: response.entity,
      type: response.type,
      priority: response.priority,
      planItems,
      existingCommitments,
      unfulfilledItems,
      totalItems: planItems.length,
      fulfilledItems: planItems.length - unfulfilledItems.length,
    })
  } catch (error) {
    return handleApiError(error)
  }
})
