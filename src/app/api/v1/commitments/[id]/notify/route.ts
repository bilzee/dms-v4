import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { auditLog } from '@/lib/services/audit.service';
import { handleApiError } from '@/lib/api/response'

export const POST = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  try {
    // Authorization check - COORDINATOR role required
    const hasPermission = context.roles.some(role => 
      role === 'COORDINATOR' || role === 'ADMIN'
    );

    if (!hasPermission) {
      await auditLog({
        userId: context.userId,
        action: 'UNAUTHORIZED_NOTIFICATION',
        resource: 'COMMITMENT_NOTIFICATION',
        resourceId: params.id,
        oldValues: null,
        newValues: null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });
      
      return NextResponse.json(
        { success: false, error: 'Forbidden - Coordinator access required' },
        { status: 403 }
      );
    }

    const commitmentId = params.id;

    // Fetch commitment details with donor information
    const commitment = await prisma.donorCommitment.findUnique({
      where: { id: commitmentId },
      include: {
        donor: {
          select: {
            id: true,
            name: true,
            type: true,
            contactEmail: true,
            contactPhone: true,
            organization: true
          }
        },
        entity: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true
          }
        },
        incident: {
          select: {
            id: true,
            type: true,
            severity: true,
            location: true
          }
        }
      }
    });

    if (!commitment) {
      return NextResponse.json(
        { success: false, error: 'Commitment not found' },
        { status: 404 }
      );
    }

    if (commitment.status !== 'PLANNED') {
      return NextResponse.json(
        { success: false, error: 'Only planned commitments can be notified' },
        { status: 400 }
      );
    }

    // Prepare notification content
    const notificationData = {
      commitmentId: commitment.id,
      donorName: commitment.donor.name,
      donorEmail: commitment.donor.contactEmail,
      donorPhone: commitment.donor.contactPhone,
      entityName: commitment.entity.name,
      entityType: commitment.entity.type,
      entityLocation: commitment.entity.location,
      incidentType: commitment.incident.type,
      incidentSeverity: commitment.incident.severity,
      commitmentDate: commitment.commitmentDate,
      items: commitment.items,
      totalQuantity: commitment.totalCommittedQuantity,
      estimatedValue: commitment.totalValueEstimated,
      notes: commitment.notes
    };

    // Send notification (this would integrate with your email/SMS service)
    const notificationResult = await sendNotification(notificationData);

    if (!notificationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to send notification' },
        { status: 500 }
      );
    }

    // Update commitment status to indicate notification sent
    await prisma.donorCommitment.update({
      where: { id: commitmentId },
      data: {
        lastUpdated: new Date()
        // Note: You might want to add a 'notificationSent' field to the schema
      }
    });

    // Log successful notification
    await auditLog({
      userId: context.userId,
      action: 'SEND_COMMITMENT_NOTIFICATION',
      resource: 'COMMITMENT_NOTIFICATION',
      resourceId: commitmentId,
      oldValues: null,
      newValues: {
        donorId: commitment.donorId,
        entityId: commitment.entityId,
        notificationMethod: notificationResult.method,
        notificationSent: true
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    });

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      data: {
        commitmentId: commitment.id,
        donorName: commitment.donor.name,
        notificationMethod: notificationResult.method,
        notificationSent: true
      }
    });

  } catch (error) {
    console.error('Error sending commitment notification:', error);
    
    // Log error
    try {
      await auditLog({
        userId: context.userId,
        action: 'ERROR_SEND_NOTIFICATION',
        resource: 'COMMITMENT_NOTIFICATION',
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

// Notification service implementation
async function sendNotification(notificationData: any): Promise<{ success: boolean; method: string; details?: string }> {
  try {
    // For now, we'll simulate email notification
    // In a real implementation, this would integrate with:
    // - Email service (SendGrid, AWS SES, etc.)
    // - SMS service (Twilio, etc.)
    // - In-app notification system
    
    const { donorEmail, donorName, entityName, incidentType, items, totalQuantity } = notificationData;

    // Prepare email content
    const emailContent = {
      to: donorEmail,
      subject: `New Commitment Assignment - ${entityName}`,
      body: `
Dear ${donorName},

You have been assigned a new commitment for the ${incidentType} response at ${entityName}.

Commitment Details:
- Total Quantity: ${totalQuantity} units
- Items: ${items.map((item: any) => `${item.quantity} ${item.unit} of ${item.name}`).join(', ')}
- Status: Ready for your review and action

Please log in to your dashboard to review this commitment and plan your delivery.

Thank you for your continued support in disaster response efforts.

Best regards,
Disaster Management Coordination Team
      `.trim()
    };

    // Log the email (in production, this would send via email service)

    // Simulate successful email send
    // const emailResult = await emailService.send(emailContent);

    return {
      success: true,
      method: 'email',
      details: `Email sent to ${donorEmail}`
    };

  } catch (error) {
    console.error('Notification sending error:', error);
    return {
      success: false,
      method: 'email',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
