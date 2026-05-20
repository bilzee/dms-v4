import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { createAuditLog } from '@/lib/utils/audit-logger';
import { handleApiError } from '@/lib/api/response'

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles } = context;
    
    // Check if user has coordinator role
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get('responseId');
    const userId = searchParams.get('userId');

    if (!responseId) {
      return NextResponse.json(
        { success: false, error: 'Response ID is required' },
        { status: 400 }
      );
    }

    // Get the response with related data
    const response = await prisma.rapidResponse.findUnique({
      where: { id: responseId },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            autoApproveEnabled: true,
            metadata: true
          }
        },
        donor: {
          select: {
            id: true,
            name: true,
            contactEmail: true
          }
        }
      }
    });

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Response not found' },
        { status: 404 }
      );
    }

    // Check if response is in a verifiable state
    if (response.verificationStatus !== 'SUBMITTED') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Response cannot be auto-approved. Current status: ${response.verificationStatus}` 
        },
        { status: 400 }
      );
    }

    // Check if entity has auto-approval enabled
    if (!response.entity.autoApproveEnabled) {
      return NextResponse.json(
        { success: false, error: 'Entity does not have auto-approval enabled' },
        { status: 400 }
      );
    }

    // Get auto-approval configuration from entity metadata
    const metadata = response.entity.metadata as any;
    const autoApprovalConfig = metadata?.autoApproval || {};

    // Check if response auto-approval is enabled for this scope
    const scope = autoApprovalConfig.scope || 'assessments';
    if (scope === 'assessments') {
      return NextResponse.json(
        { success: false, error: 'Auto-approval is only configured for assessments' },
        { status: 400 }
      );
    }

    // Check response type conditions
    if (autoApprovalConfig.responseTypes && autoApprovalConfig.responseTypes.length > 0) {
      if (!autoApprovalConfig.responseTypes.includes(response.type)) {
        return NextResponse.json(
          { success: false, error: `Response type ${response.type} is not configured for auto-approval` },
          { status: 400 }
        );
      }
    }

    // Check priority conditions
    if (autoApprovalConfig.maxPriority) {
      const priorityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      const configPriorityLevel = priorityLevels[autoApprovalConfig.maxPriority as keyof typeof priorityLevels];
      const responsePriorityLevel = priorityLevels[response.priority as keyof typeof priorityLevels];
      
      if (responsePriorityLevel > configPriorityLevel) {
        return NextResponse.json(
          { success: false, error: `Response priority ${response.priority} exceeds maximum allowed priority ${autoApprovalConfig.maxPriority}` },
          { status: 400 }
        );
      }
    }

    // Check documentation requirements (if applicable)
    if (autoApprovalConfig.requiresDocumentation) {
      // For responses, we might check if there are delivery photos, proof of delivery, etc.
      // This would be based on business requirements
      const hasDocumentation = response.resources && 
                             typeof response.resources === 'object' && 
                             Object.keys(response.resources).length > 0;
      
      if (!hasDocumentation) {
        return NextResponse.json(
          { success: false, error: 'Response lacks required documentation for auto-approval' },
          { status: 400 }
        );
      }
    }

    // All conditions met - auto-approve the response
    const updatedResponse = await prisma.rapidResponse.update({
      where: { id: responseId },
      data: {
        verificationStatus: 'AUTO_VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: userId || 'system',
        updatedAt: new Date()
      },
      include: {
        entity: {
          select: { id: true, name: true, type: true }
        },
        donor: {
          select: { id: true, name: true, contactEmail: true }
        }
      }
    });

    // Create audit log
    await createAuditLog({
      userId: userId || 'system',
      action: 'AUTO_APPROVE_RESPONSE',
      resource: 'RapidResponse',
      resourceId: responseId,
      oldValues: { verificationStatus: response.verificationStatus },
      newValues: { 
        verificationStatus: 'AUTO_VERIFIED', 
        verifiedAt: new Date(),
        autoApprovalConfig
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedResponse,
      message: 'Response auto-approved successfully',
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Response auto-approval error:', error);
    return handleApiError(error);
  }
});

// GET - Check auto-approval eligibility for a response
export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles } = context;
    
    // Check if user has coordinator role
    if (!roles.includes('COORDINATOR')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Coordinator role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get('responseId');

    if (!responseId) {
      return NextResponse.json(
        { success: false, error: 'Response ID is required' },
        { status: 400 }
      );
    }

    // Get the response with related data
    const response = await prisma.rapidResponse.findUnique({
      where: { id: responseId },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            autoApproveEnabled: true,
            metadata: true
          }
        }
      }
    });

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Response not found' },
        { status: 404 }
      );
    }

    // Check auto-approval eligibility
    const metadata = response.entity.metadata as any;
    const autoApprovalConfig = metadata?.autoApproval || {};

    const eligibility = {
      isEligible: false,
      reason: '',
      checks: {
        entityAutoApprovalEnabled: response.entity.autoApproveEnabled,
        scopeIncludesResponses: false,
        responseTypeMatch: false,
        priorityWithinLimit: false,
        documentationRequirementMet: true as boolean,
        currentStatus: response.verificationStatus
      }
    };

    // Basic checks
    if (!response.entity.autoApproveEnabled) {
      eligibility.reason = 'Entity auto-approval is disabled';
      return NextResponse.json({ success: true, data: eligibility });
    }

    if (response.verificationStatus !== 'SUBMITTED') {
      eligibility.reason = `Response is not in SUBMITTED status (current: ${response.verificationStatus})`;
      return NextResponse.json({ success: true, data: eligibility });
    }

    // Scope check
    const scope = autoApprovalConfig.scope || 'assessments';
    eligibility.checks.scopeIncludesResponses = scope === 'responses' || scope === 'both';
    
    if (!eligibility.checks.scopeIncludesResponses) {
      eligibility.reason = 'Auto-approval scope does not include responses';
      return NextResponse.json({ success: true, data: eligibility });
    }

    // Response type check
    if (autoApprovalConfig.responseTypes && autoApprovalConfig.responseTypes.length > 0) {
      eligibility.checks.responseTypeMatch = autoApprovalConfig.responseTypes.includes(response.type);
      
      if (!eligibility.checks.responseTypeMatch) {
        eligibility.reason = `Response type ${response.type} is not in allowed types`;
        return NextResponse.json({ success: true, data: eligibility });
      }
    } else {
      eligibility.checks.responseTypeMatch = true; // No type restrictions
    }

    // Priority check
    if (autoApprovalConfig.maxPriority) {
      const priorityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      const configPriorityLevel = priorityLevels[autoApprovalConfig.maxPriority as keyof typeof priorityLevels];
      const responsePriorityLevel = priorityLevels[response.priority as keyof typeof priorityLevels];
      
      eligibility.checks.priorityWithinLimit = responsePriorityLevel <= configPriorityLevel;
      
      if (!eligibility.checks.priorityWithinLimit) {
        eligibility.reason = `Response priority ${response.priority} exceeds maximum allowed ${autoApprovalConfig.maxPriority}`;
        return NextResponse.json({ success: true, data: eligibility });
      }
    } else {
      eligibility.checks.priorityWithinLimit = true; // No priority restrictions
    }

    // Documentation check
    if (autoApprovalConfig.requiresDocumentation) {
      const hasDocumentation = response.resources && 
                             typeof response.resources === 'object' && 
                             Object.keys(response.resources).length > 0;
      eligibility.checks.documentationRequirementMet = Boolean(hasDocumentation);
      
      if (!eligibility.checks.documentationRequirementMet) {
        eligibility.reason = 'Response lacks required documentation';
        return NextResponse.json({ success: true, data: eligibility });
      }
    } else {
      eligibility.checks.documentationRequirementMet = true; // No documentation requirement
    }

    // All checks passed
    eligibility.isEligible = true;
    eligibility.reason = 'Response is eligible for auto-approval';

    return NextResponse.json({
      success: true,
      data: eligibility,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    });

  } catch (error) {
    console.error('Auto-approval eligibility check error:', error);
    return handleApiError(error);
  }
});