import { prisma } from '@/lib/db/client'
import { 
  RapidResponse, 
  DeliveryStatus, 
  VerificationStatus,
  SyncStatus,
  Prisma
} from '@prisma/client'
import { 
  CreatePlannedResponseInput,
  CreateDeliveredResponseInput,
  UpdatePlannedResponseInput,
  ResponseQueryInput,
  ResponseItem,
  ConfirmDeliveryInput
} from '@/lib/validation/response'

// Auto-approval configuration shape stored in entity metadata
interface AutoApprovalConfigData {
  scope?: string;
  responseTypes?: string[];
  maxPriority?: string;
  requiresDocumentation?: boolean;
}

interface AssessmentRelation {
  id: string;
  rapidAssessmentType: string;
  rapidAssessmentDate: Date;
  verificationStatus: string;
  location?: string | null;
  coordinates?: unknown;
  entity?: {
    id: string;
    name: string;
    type: string;
    location?: string | null;
    coordinates?: unknown;
  };
}

interface EntityRelation {
  id: string;
  name: string;
  type: string;
  location?: string | null;
  coordinates?: unknown;
}

interface ResponderRelation {
  id: string;
  name: string;
  email: string;
}

export type RapidResponseWithData = RapidResponse & {
  assessment?: AssessmentRelation | null
  entity?: EntityRelation | null
  responder?: ResponderRelation | null
}

export class ResponseService {
  static async createPlannedResponse(
    input: CreatePlannedResponseInput,
    responderId: string
  ): Promise<RapidResponseWithData> {
    const { assessmentId, entityId, items, ...baseData } = input

    // Validate responder has assignment to this entity
    await this.validateEntityAssignment(responderId, entityId)
    
    // Validate assessment exists and is verified
    const assessment = await this.validateAssessmentAccess(assessmentId, entityId)

    // Check for existing planned response for this assessment
    const existingResponse = await prisma.rapidResponse.findFirst({
      where: {
        assessmentId,
        deliveryStatus: 'PLANNED'
      }
    })

    if (existingResponse) {
      throw new Error('A planned response already exists for this assessment')
    }

    // Create the planned response
    const result = await prisma.$transaction(async (tx) => {
      const response = await tx.rapidResponse.create({
        data: {
          ...baseData,
          assessmentId,
          entityId,
          responderId,
          deliveryStatus: 'PLANNED' as DeliveryStatus,
          verificationStatus: 'DRAFT' as VerificationStatus,
          syncStatus: 'LOCAL' as SyncStatus,
          items: items as unknown as Prisma.InputJsonValue, // JSON field
          plannedDate: new Date()
        },
        include: {
          assessment: {
            select: {
              id: true,
              rapidAssessmentType: true,
              rapidAssessmentDate: true,
              verificationStatus: true,
              entity: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          },
          entity: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          responder: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Log audit trail
      await this.createAuditLog(
        tx,
        responderId,
        'CREATE',
        'response',
        response.id,
        null,
        {
          assessmentId,
          entityId,
          type: baseData.type,
          priority: baseData.priority,
          itemsCount: items.length
        }
      )

      return response
    })

    try {
      const { ActionSignalService } = await import('@/lib/services/action-signal.service');
      await ActionSignalService.evaluateAndGenerate({
        trigger: 'response-created',
        entityId: result.entityId,
        incidentId: (result as any).incidentId,
        responseId: result.id,
        responseType: result.type,
        responsePriority: result.priority,
      });
    } catch (e) {
      console.error('[ResponseService] signal hook error (response-created):', e);
    }

    return result as unknown as RapidResponseWithData
  }

  static async createDeliveredResponse(
    input: CreateDeliveredResponseInput,
    responderId: string
  ): Promise<RapidResponseWithData> {
    const { assessmentId, entityId, items, deliveryNotes, ...baseData } = input

    // Validate responder has assignment to this entity
    await this.validateEntityAssignment(responderId, entityId)
    
    // Validate assessment exists and is verified
    const assessment = await this.validateAssessmentAccess(assessmentId, entityId)

    // Create the delivered response
    const result = await prisma.$transaction(async (tx) => {
      const response = await tx.rapidResponse.create({
        data: {
          ...baseData,
          responderId,
          assessmentId,
          entityId,
          deliveryStatus: 'DELIVERED',
          verificationStatus: 'SUBMITTED', // Delivered responses go straight to verification queue
          verifiedAt: new Date(), // Mark as verified for delivery timestamp
          items: items,
          resources: deliveryNotes ? { deliveryNotes } : undefined,
          versionNumber: 1,
          isOfflineCreated: false,
          syncStatus: 'SYNCED'
        }
      })

      // Create audit log
      await this.createAuditLog(
        tx,
        responderId,
        'CREATE',
        'response',
        response.id,
        null,
        {
          assessmentId,
          entityId,
          type: baseData.type,
          priority: baseData.priority,
          deliveryStatus: 'DELIVERED',
          itemsCount: items.length,
          deliveryNotes
        }
      )

      return response
    })

    return result as unknown as RapidResponseWithData
  }

  static async getResponseById(
    responseId: string,
    requesterId: string
  ): Promise<RapidResponseWithData> {
    const response = await prisma.rapidResponse.findUnique({
      where: { id: responseId },
      include: {
        assessment: {
          select: {
            id: true,
            rapidAssessmentType: true,
            rapidAssessmentDate: true,
            verificationStatus: true,
            location: true,
            coordinates: true,
            entity: {
              select: {
                id: true,
                name: true,
                type: true,
                location: true,
                coordinates: true
              }
            }
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            coordinates: true
          }
        },
        responder: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
      }
    })

    if (!response) {
      throw new Error('Response not found')
    }

    // Validate requester has access to this entity's responses
    await this.validateEntityAssignment(requesterId, response.entityId)

    return response as unknown as RapidResponseWithData
  }

  static async updatePlannedResponse(
    responseId: string,
    input: UpdatePlannedResponseInput,
    requesterId: string
  ): Promise<RapidResponseWithData> {
    // Get existing response and validate access
    const existingResponse = await this.getResponseById(responseId, requesterId)

    // Can only update responses in PLANNED status or with REJECTED verification status
    if (existingResponse.deliveryStatus !== 'PLANNED' && existingResponse.verificationStatus !== 'REJECTED') {
      throw new Error('Only planned responses or rejected deliveries can be updated')
    }

    // Update the response
    const result = await prisma.$transaction(async (tx) => {
      const oldValues = {
        type: existingResponse.type,
        priority: existingResponse.priority,
        description: existingResponse.description,
        items: existingResponse.items
      }

      // If response was rejected, resubmit for verification and clear rejection reason
      const updateData: Record<string, unknown> = {
        ...input,
        updatedAt: new Date()
      }
      
      if (existingResponse.verificationStatus === 'REJECTED') {
        updateData.deliveryStatus = 'DELIVERED'  // Keep as delivered
        updateData.verificationStatus = 'SUBMITTED'  // Resubmit for verification
        updateData.rejectionReason = null  // Clear rejection reason
        updateData.verifiedAt = null  // Clear previous verification timestamp
      }

      const response = await tx.rapidResponse.update({
        where: { id: responseId },
        data: updateData,
        include: {
          assessment: {
            select: {
              id: true,
              rapidAssessmentType: true,
              rapidAssessmentDate: true,
              verificationStatus: true
            }
          },
          entity: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          responder: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Log audit trail
      await this.createAuditLog(
        tx,
        requesterId,
        'UPDATE',
        'response',
        responseId,
        oldValues,
        input
      )

      return response
    })

    return result
  }

  static async getPlannedResponsesForResponder(
    responderId: string,
    query: ResponseQueryInput = { limit: 20, page: 1 }
  ): Promise<{ responses: RapidResponseWithData[], total: number }> {
    const { page = 1, limit = 20, ...filters } = query

    // Get entities assigned to this responder
    const assignedEntities = await prisma.entityAssignment.findMany({
      where: { userId: responderId },
      select: { entityId: true }
    })

    const entityIds = assignedEntities.map(ea => ea.entityId)

    if (entityIds.length === 0) {
      return { responses: [], total: 0 }
    }

    // Build where clause
    const where: Prisma.RapidResponseWhereInput = {
      entityId: { in: entityIds },
      deliveryStatus: 'PLANNED'
    }

    if (filters.assessmentId) where.assessmentId = filters.assessmentId
    if (filters.entityId) where.entityId = filters.entityId
    if (filters.type) where.type = filters.type
    if ((filters as any).incidentId) {
      where.assessment = { incidentId: (filters as any).incidentId }
    }

    // Get total count
    const total = await prisma.rapidResponse.count({ where })

    // Get paginated responses
    const responses = await prisma.rapidResponse.findMany({
      where,
      include: {
        assessment: {
          select: {
            id: true,
            rapidAssessmentType: true,
            rapidAssessmentDate: true,
            verificationStatus: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        responder: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { plannedDate: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    })

    return { responses: responses as unknown as RapidResponseWithData[], total }
  }

  static async getAssignedResponsesForResponder(
    responderId: string,
    query: ResponseQueryInput = { limit: 20, page: 1 }
  ): Promise<{ responses: RapidResponseWithData[], total: number }> {
    const { page = 1, limit = 20, ...filters } = query

    // Get entities assigned to this responder
    const assignedEntities = await prisma.entityAssignment.findMany({
      where: { userId: responderId },
      select: { entityId: true }
    })

    const entityIds = assignedEntities.map(ea => ea.entityId)

    if (entityIds.length === 0) {
      return { responses: [], total: 0 }
    }

    // Build where clause - include ALL statuses, not just PLANNED
    const where: Prisma.RapidResponseWhereInput = {
      entityId: { in: entityIds }
    }

    if (filters.assessmentId) where.assessmentId = filters.assessmentId
    if (filters.entityId) where.entityId = filters.entityId
    if (filters.type) where.type = filters.type
    if (filters.deliveryStatus) where.deliveryStatus = filters.deliveryStatus

    // Get total count
    const total = await prisma.rapidResponse.count({ where })

    // Get paginated responses
    const responses = await prisma.rapidResponse.findMany({
      where,
      include: {
        assessment: {
          select: {
            id: true,
            rapidAssessmentType: true,
            rapidAssessmentDate: true,
            verificationStatus: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        responder: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { plannedDate: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    })

    return { responses: responses as unknown as RapidResponseWithData[], total }
  }

  static async confirmDelivery(
    responseId: string,
    input: ConfirmDeliveryInput,
    requesterId: string
  ): Promise<RapidResponseWithData> {
    // Get existing response and validate access
    const existingResponse = await this.getResponseById(responseId, requesterId)

    // Can only confirm delivery for responses in PLANNED status
    if (existingResponse.deliveryStatus !== 'PLANNED') {
      throw new Error('Only planned responses can have delivery confirmed')
    }

    // Check if entity has auto-approval configured
    const entityAutoApproval = await prisma.entity.findUnique({
      where: { id: existingResponse.entityId },
      select: {
        id: true,
        autoApproveEnabled: true,
        metadata: true
      }
    })

    // Determine verification status based on auto-approval
    let verificationStatus: VerificationStatus = 'SUBMITTED'
    
    console.log('🔍 Auto-approval check:', {
      entityId: existingResponse.entityId,
      entityFound: !!entityAutoApproval,
      autoApproveEnabled: entityAutoApproval?.autoApproveEnabled,
      metadata: entityAutoApproval?.metadata,
      hasConfig: !!(entityAutoApproval?.metadata as Record<string, unknown> | null)?.autoApproval
    })

    if (entityAutoApproval?.autoApproveEnabled) {
      // Check if auto-approval conditions are met
      const metadataRecord = entityAutoApproval.metadata as Record<string, unknown> | null
      const config = metadataRecord?.autoApproval as AutoApprovalConfigData | undefined
      
      console.log('🔍 Auto-approval config:', config)
      
      // Create enhanced response object with delivery data for evaluation
      const responseWithDeliveryData = {
        ...existingResponse,
        resources: {
          deliveryLocation: input.deliveryLocation,
          deliveryNotes: input.deliveryNotes,
          mediaAttachmentIds: input.mediaAttachmentIds,
          deliveredAt: new Date().toISOString()
        }
      }
      
      const shouldAutoVerify = config ? this.checkAutoApprovalConditions(responseWithDeliveryData, config) : false
      
      console.log('🔍 Auto-approval evaluation:', {
        shouldAutoVerify,
        responseType: existingResponse.type,
        priority: existingResponse.priority,
        hasDeliveryData: {
          location: !!input.deliveryLocation,
          notes: !!input.deliveryNotes,
          media: !!input.mediaAttachmentIds?.length
        }
      })
      
      if (shouldAutoVerify) {
        verificationStatus = 'VERIFIED'
      }
    }

    // Update the response to delivered status
    const result = await prisma.$transaction(async (tx) => {
      const oldValues = {
        deliveryStatus: existingResponse.deliveryStatus,
        deliveredItems: existingResponse.items,
        deliveryLocation: (existingResponse.resources as Record<string, unknown> | null)?.deliveryLocation,
        deliveryNotes: (existingResponse.resources as Record<string, unknown> | null)?.deliveryNotes,
        mediaAttachmentIds: (existingResponse.resources as Record<string, unknown> | null)?.mediaAttachmentIds,
        verificationStatus: existingResponse.verificationStatus
      }

      const updateData: Record<string, unknown> = {
        deliveryStatus: 'DELIVERED',
        verificationStatus,
        items: input.deliveredItems,
        resources: {
          deliveryLocation: input.deliveryLocation,
          deliveryNotes: input.deliveryNotes,
          mediaAttachmentIds: input.mediaAttachmentIds,
          deliveredAt: new Date().toISOString()
        },
        responseDate: new Date(),
        updatedAt: new Date()
      }

      if (verificationStatus === 'VERIFIED') {
        updateData.verifiedAt = new Date()
        updateData.verifiedBy = 'auto-approval'
      }

      const response = await tx.rapidResponse.update({
        where: { id: responseId },
        data: updateData,
        include: {
          assessment: {
            select: {
              id: true,
              rapidAssessmentType: true,
              rapidAssessmentDate: true,
              verificationStatus: true
            }
          },
          entity: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          responder: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          planCommitments: {
            select: { commitmentId: true }
          }
        }
      })

      if (input.deliveredItems) {
        const deliveredItems = input.deliveredItems as Array<{ name: string; quantity: number }>;

        const commitmentIdsToUpdate = new Set<string>();
        for (const pc of response.planCommitments) {
          commitmentIdsToUpdate.add(pc.commitmentId);
        }

        const sourceCommitments = await tx.donorCommitment.findMany({
          where: { sourcePlanId: responseId },
          select: { id: true },
        });
        for (const sc of sourceCommitments) {
          commitmentIdsToUpdate.add(sc.id);
        }

        for (const commitmentId of commitmentIdsToUpdate) {
          const commitment = await tx.donorCommitment.findUnique({
            where: { id: commitmentId },
            select: { id: true, items: true, deliveredQuantity: true, totalCommittedQuantity: true, status: true },
          });
          if (!commitment?.items) continue;

          const cItems = (commitment.items as Array<{ name: string; quantity: number; unit: string; deliveredQuantity?: number }>).map(ci => {
            const delivered = deliveredItems.find(di => di.name === ci.name);
            return {
              ...ci,
              deliveredQuantity: (ci.deliveredQuantity || 0) + (delivered?.quantity || 0),
            };
          });

          const newDeliveredQty = cItems.reduce((s, i) => s + (i.deliveredQuantity || 0), 0);
          let newStatus: string = commitment.status;
          const allFullyDelivered = cItems.every(ci => (ci.deliveredQuantity || 0) >= ci.quantity);
          const anyDelivered = cItems.some(ci => (ci.deliveredQuantity || 0) > 0);
          if (allFullyDelivered) newStatus = 'COMPLETE';
          else if (anyDelivered) newStatus = 'PARTIAL';

          await tx.donorCommitment.update({
            where: { id: commitmentId },
            data: {
              items: cItems,
              deliveredQuantity: newDeliveredQty,
              status: newStatus as any,
            },
          });
        }
      }

      await this.createAuditLog(
        tx,
        requesterId,
        'CONFIRM_DELIVERY',
        'RapidResponse',
        responseId,
        oldValues,
        {
          deliveryStatus: 'DELIVERED',
          verificationStatus,
          items: input.deliveredItems,
          resources: {
            deliveryLocation: input.deliveryLocation,
            deliveryNotes: input.deliveryNotes,
            mediaAttachmentIds: input.mediaAttachmentIds
          },
          responseDate: response.responseDate,
          verifiedAt: verificationStatus === 'VERIFIED' ? new Date() : null,
          verifiedBy: verificationStatus === 'VERIFIED' ? 'auto-approval' : null
        }
      )

      return response
    })

    try {
      const { ActionSignalService } = await import('@/lib/services/action-signal.service');
      await ActionSignalService.evaluateAndGenerate({
        trigger: 'response-delivered',
        entityId: existingResponse.entityId,
        incidentId: (existingResponse as any).incidentId,
        responseId,
        responseType: existingResponse.type,
        responsePriority: existingResponse.priority,
      });
    } catch (e) {
      console.error('[ResponseService] signal hook error:', e);
    }

    return result as unknown as RapidResponseWithData
  }

  private static checkAutoApprovalConditions(
    response: { type: string; priority: string; resources?: Record<string, unknown> | null },
    config: AutoApprovalConfigData
  ): boolean {
    console.log('🔍 Checking auto-approval conditions:', {
      hasConfig: !!config,
      configStructure: config
    })

    if (!config) {
      console.log('❌ No auto-approval config found')
      return false
    }

    // Check response scope
    if (config.scope && config.scope !== 'both' && config.scope !== 'responses') {
      console.log('❌ Scope check failed:', config.scope)
      return false
    }
    
    // Check response types (if specified)
    if (config.responseTypes && config.responseTypes.length > 0) {
      if (!config.responseTypes.includes(response.type)) {
        console.log('❌ Response type check failed:', { 
          allowedTypes: config.responseTypes, 
          actualType: response.type 
        })
        return false
      }
    }
    
    // Check priority level
    if (config.maxPriority) {
      const priorityLevels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 } as const
      const maxPriorityLevel = priorityLevels[config.maxPriority as keyof typeof priorityLevels] || 2
      const responsePriorityLevel = priorityLevels[response.priority as keyof typeof priorityLevels] || 2
      
      if (responsePriorityLevel > maxPriorityLevel) {
        console.log('❌ Priority check failed:', { 
          maxAllowed: config.maxPriority, 
          actualPriority: response.priority 
        })
        return false
      }
    }
    
    // Check documentation requirement
    if (config.requiresDocumentation) {
      const resources = (response.resources || {}) as Record<string, unknown>
      const mediaAttachmentIds = resources.mediaAttachmentIds as unknown[] | undefined
      const hasDocumentation = resources.deliveryNotes && 
        ((mediaAttachmentIds?.length ?? 0) > 0 || resources.deliveryLocation)
      
      console.log('🔍 Documentation check:', {
        requiresDocumentation: config.requiresDocumentation,
        hasDeliveryNotes: !!resources.deliveryNotes,
        hasMediaAttachments: !!(mediaAttachmentIds?.length),
        hasDeliveryLocation: !!resources.deliveryLocation,
        hasDocumentation
      })
      
      if (!hasDocumentation) {
        console.log('❌ Documentation check failed')
        return false
      }
    }
    
    console.log('✅ All auto-approval conditions passed')
    return true
  }

  private static async validateEntityAssignment(
    userId: string,
    entityId: string
  ): Promise<void> {
    const assignment = await prisma.entityAssignment.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId
        }
      }
    })

    if (!assignment) {
      throw new Error('User is not assigned to this entity')
    }
  }

  private static async validateAssessmentAccess(
    assessmentId: string,
    entityId: string
  ): Promise<{ id: string; entityId: string; verificationStatus: string }> {
    const assessment = await prisma.rapidAssessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        entityId: true,
        verificationStatus: true
      }
    })

    if (!assessment) {
      throw new Error('Assessment not found')
    }

    if (assessment.entityId !== entityId) {
      throw new Error('Assessment does not belong to this entity')
    }

    if (assessment.verificationStatus !== 'VERIFIED' && assessment.verificationStatus !== 'AUTO_VERIFIED') {
      throw new Error('Assessment must be verified before response planning')
    }

    return assessment
  }

  private static async createAuditLog(
    tx: Prisma.TransactionClient,
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown>
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldValues: oldValues as unknown as Prisma.InputJsonValue,
        newValues: newValues as unknown as Prisma.InputJsonValue
      }
    })
  }
}