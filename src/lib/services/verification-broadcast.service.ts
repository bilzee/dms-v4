import { prisma } from '@/lib/db/client';

interface QueueMetrics {
  totalPending: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface QueueSnapshot {
  timestamp: string;
  assessments: QueueMetrics;
  deliveries: QueueMetrics;
  totalPending: number;
}

export function broadcastVerificationUpdate(update: {
  type: 'assessment' | 'delivery';
  action: 'created' | 'updated' | 'verified' | 'rejected';
  data: Record<string, unknown>;
}) {
  const message = JSON.stringify({
    messageType: 'verification_update',
    timestamp: new Date().toISOString(),
    ...update
  });

  console.log('Broadcasting verification update:', message);
}

export async function getQueueSnapshot(): Promise<QueueSnapshot | null> {
  try {
    const [assessmentMetrics, deliveryMetrics] = await Promise.all([
      getAssessmentQueueMetrics(),
      getDeliveryQueueMetrics()
    ]);

    return {
      timestamp: new Date().toISOString(),
      assessments: assessmentMetrics,
      deliveries: deliveryMetrics,
      totalPending: assessmentMetrics.totalPending + deliveryMetrics.totalPending
    };
  } catch (error) {
    console.error('Error getting queue snapshot:', error);
    return null;
  }
}

async function getAssessmentQueueMetrics(): Promise<QueueMetrics> {
  const unverified = await prisma.rapidAssessment.count({
    where: { verificationStatus: 'SUBMITTED' }
  });

  return {
    totalPending: unverified,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
}

async function getDeliveryQueueMetrics(): Promise<QueueMetrics> {
  const unverified = await prisma.rapidResponse.count({
    where: { verificationStatus: 'SUBMITTED' }
  });

  return {
    totalPending: unverified,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
}
