import webpush from 'web-push';
import { prisma } from '@/lib/db/client';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@dms-borno.gov.ng',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export class PushNotificationService {
  static async subscribe(
    userId: string,
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      browserInfo?: string;
    }
  ) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        browserInfo: subscription.browserInfo || null,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        browserInfo: subscription.browserInfo || null,
      },
    });
  }

  static async unsubscribe(userId: string, endpoint: string) {
    return prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  static async sendToUser(userId: string, payload: { title: string; body: string; data?: Record<string, unknown> }) {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return { sent: 0, failed: 0 };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    let sent = 0;
    let failed = 0;
    const staleEndpoints: string[] = [];

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      timestamp: Date.now(),
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload
        );
        sent++;
      } catch (error: any) {
        failed++;
        const statusCode = error?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    }

    if (staleEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: staleEndpoints } },
      });
    }

    return { sent, failed };
  }

  static async getVapidPublicKey(): Promise<string | null> {
    return process.env.VAPID_PUBLIC_KEY || null;
  }
}
