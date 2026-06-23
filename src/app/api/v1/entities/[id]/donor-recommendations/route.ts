import { NextRequest } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { auditLog } from '@/lib/services/audit.service';
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response'

export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    if (!context.roles.some(role => role === 'COORDINATOR' || role === 'ADMIN')) {
      await auditLog({
        userId: context.userId,
        action: 'UNAUTHORIZED_ACCESS',
        resource: 'DONOR_RECOMMENDATIONS',
        resourceId: params.id,
        oldValues: null,
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });

      return errorResponse('Forbidden - Coordinator access required', 403);
    }

    const entityId = params.id;

    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      select: { id: true, name: true, type: true, location: true }
    });

    if (!entity) {
      return errorResponse('Entity not found', 404);
    }

    // Gather entity's needed resource names from RapidResponse plans
    const responsePlans = await prisma.rapidResponse.findMany({
      where: { entityId },
      select: { items: true, deliveryStatus: true }
    });

    const neededItems = new Map<string, number>();
    for (const plan of responsePlans) {
      const items = (Array.isArray(plan.items) ? plan.items : []) as any[];
      for (const item of items) {
        const name = item?.name || 'Unknown';
        neededItems.set(name, (neededItems.get(name) || 0) + (item?.quantity || 0));
      }
    }

    // Also gather already-committed/delivered items to compute remaining gaps
    const commitments = await prisma.donorCommitment.findMany({
      where: { entityId },
      select: { items: true, deliveredQuantity: true, totalCommittedQuantity: true }
    });

    const fulfilledByItem = new Map<string, number>();
    for (const c of commitments) {
      const items = (Array.isArray(c.items) ? c.items : []) as any[];
      for (const item of items) {
        const name = item?.name || 'Unknown';
        const proportionalDelivered = c.totalCommittedQuantity > 0
          ? Math.round((c.deliveredQuantity / c.totalCommittedQuantity) * (item?.quantity || 0))
          : 0;
        fulfilledByItem.set(name, (fulfilledByItem.get(name) || 0) + proportionalDelivered);
      }
    }

    // Build the list of unmet needs (gap > 0)
    const unmetNeeds: Array<{ name: string; gap: number }> = [];
    for (const [name, needed] of neededItems) {
      const fulfilled = fulfilledByItem.get(name) || 0;
      const gap = Math.max(0, needed - fulfilled);
      if (gap > 0) unmetNeeds.push({ name, gap });
    }

    // Fetch all active donors with their commitment history
    const donors = await prisma.donor.findMany({
      where: { isActive: true },
      include: {
        commitments: {
          select: {
            items: true,
            status: true,
            deliveredQuantity: true,
            totalCommittedQuantity: true,
            entityId: true,
          }
        }
      }
    });

    type Recommendation = {
      donorId: string;
      donor: { id: string; name: string; type: string; contactEmail: string | null; contactPhone: string | null; organization: string | null };
      compatibilityScore: number;
      recommendedItems: Array<{ itemName: string; maxQuantity: number; matchReason: string }>;
      totalCapacity: number;
    };

    const recommendations: Recommendation[] = [];

    for (const donor of donors) {
      // Build a profile of item names this donor has historically committed
      const donorItemProfile = new Map<string, { totalQuantity: number; deliveredCount: number }>();

      for (const commitment of donor.commitments) {
        const items = (Array.isArray(commitment.items) ? commitment.items : []) as any[];
        for (const item of items) {
          const name = item?.name || 'Unknown';
          const existing = donorItemProfile.get(name) || { totalQuantity: 0, deliveredCount: 0 };
          existing.totalQuantity += item?.quantity || 0;
          if (commitment.status === 'COMPLETE' || commitment.deliveredQuantity > 0) {
            existing.deliveredCount++;
          }
          donorItemProfile.set(name, existing);
        }
      }

      // Has this donor previously contributed to this entity?
      const hasHistoryWithEntity = donor.commitments.some(c => c.entityId === entityId);

      // Match donor profile against unmet needs
      const matchedItems: Recommendation['recommendedItems'] = [];
      let matchCount = 0;

      for (const need of unmetNeeds) {
        const profile = donorItemProfile.get(need.name);
        if (profile) {
          matchCount++;
          matchedItems.push({
            itemName: need.name,
            maxQuantity: need.gap,
            matchReason: `Previously committed ${profile.totalQuantity} units of this item${profile.deliveredCount > 0 ? ` (${profile.deliveredCount} delivered)` : ''}`,
          });
        }
      }

      // Calculate compatibility score
      let score = 0;
      if (unmetNeeds.length > 0) {
        score = Math.round((matchCount / unmetNeeds.length) * 100);
      }

      // Boost score if donor has delivery history with this entity
      if (hasHistoryWithEntity) {
        score = Math.min(100, score + 15);
      }

      // Boost score based on verified delivery rate
      const verifiedRate = donor.verifiedDeliveryRate || 0;
      score = Math.min(100, score + Math.round(verifiedRate * 0.1));

      // Only include donors with at least some relevance
      if (score > 0 || matchedItems.length > 0 || hasHistoryWithEntity) {
        recommendations.push({
          donorId: donor.id,
          donor: {
            id: donor.id,
            name: donor.name,
            type: donor.type,
            contactEmail: donor.contactEmail,
            contactPhone: donor.contactPhone,
            organization: donor.organization,
          },
          compatibilityScore: score,
          recommendedItems: matchedItems.length > 0 ? matchedItems : unmetNeeds.map(n => ({
            itemName: n.name,
            maxQuantity: n.gap,
            matchReason: hasHistoryWithEntity ? 'Previous contributor to this entity' : 'Active donor in system',
          })),
          totalCapacity: donor.commitments.reduce((acc, c) => acc + (c.totalCommittedQuantity || 0), 0),
        });
      }
    }

    // Sort by compatibility score descending
    recommendations.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    await auditLog({
      userId: context.userId,
      action: 'ACCESS_DONOR_RECOMMENDATIONS',
      resource: 'DONOR_RECOMMENDATIONS',
      resourceId: entityId,
      oldValues: null,
      newValues: { donorsFound: recommendations.length, unmetNeeds: unmetNeeds.length },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return successResponse({ data: recommendations });

  } catch (error) {
    console.error('Error fetching donor recommendations:', error);

    try {
      await auditLog({
        userId: context.userId,
        action: 'ERROR_ACCESS_DONOR_RECOMMENDATIONS',
        resource: 'DONOR_RECOMMENDATIONS',
        resourceId: params.id,
        oldValues: null,
        newValues: { error: error instanceof Error ? error.message : 'Unknown error' },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });
    } catch (auditError) {
      // Ignore audit log errors
    }

    return handleApiError(error);
  }
})
