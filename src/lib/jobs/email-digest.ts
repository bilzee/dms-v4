import { prisma } from '@/lib/db/client';
import { renderDigestEmail } from '@/lib/email/templates/digest-email';
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import type { SignalReason, SignalPriority } from '@/types/action-signal';

interface DigestResult {
  sent: number;
  skipped: number;
  errors: number;
}

export async function runEmailDigest(): Promise<DigestResult> {
  const result: DigestResult = { sent: 0, skipped: 0, errors: 0 };

  const globalSettings = await prisma.systemSetting.findMany({
    where: { section: 'notification' },
  });
  const settingMap = new Map(globalSettings.map(s => [s.key, s.value as any]));

  const digestEnabled = settingMap.get('emailDigestEnabled') === true;
  if (!digestEnabled) {
    return result;
  }

  const digestTime = settingMap.get('emailDigestTime') || '08:00';
  const currentHour = new Date().getHours();
  const digestHour = parseInt(digestTime.split(':')[0], 10);

  if (Math.abs(currentHour - digestHour) > 1) {
    return result;
  }

  const optedOutSettings = await prisma.systemSetting.findMany({
    where: {
      section: 'notification-user',
      key: { endsWith: ':emailEnabled' },
      value: { equals: false },
    },
    select: { key: true },
  });
  const optedOutUserIds = new Set(
    optedOutSettings.map(s => s.key.replace(':emailEnabled', ''))
  );

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      email: { not: '' },
      id: { notIn: Array.from(optedOutUserIds) },
    },
    select: { id: true, email: true, name: true },
  });

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const user of users) {
    try {
      const signals = await prisma.actionSignal.findMany({
        where: {
          userId: user.id,
          resolvedAt: null,
          priority: { not: 'CRITICAL' },
          createdAt: { gte: twentyFourHoursAgo },
        },
        include: {
          entity: { select: { name: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });

      if (signals.length === 0) {
        result.skipped++;
        continue;
      }

      const entityMap = new Map<string, { entityName: string; signals: Array<{ signalReason: SignalReason; priority: SignalPriority; createdAt: Date }> }>();
      for (const signal of signals) {
        const key = signal.entityId;
        if (!entityMap.has(key)) {
          entityMap.set(key, { entityName: signal.entity.name, signals: [] });
        }
        entityMap.get(key)!.signals.push({
          signalReason: signal.signalReason as SignalReason,
          priority: signal.priority as SignalPriority,
          createdAt: signal.createdAt,
        });
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const unsubscribeToken = generateUnsubscribeToken(user.id);
      const unsubscribeUrl = `${baseUrl}/api/v1/notifications/unsubscribe?userId=${user.id}&token=${unsubscribeToken}`;

      const { html, text } = renderDigestEmail({
        userName: user.name || 'User',
        entityGroups: Array.from(entityMap.values()),
        totalSignals: signals.length,
        totalEntities: entityMap.size,
        dashboardUrl: `${baseUrl}/dashboard`,
        unsubscribeUrl,
      });

      const { emailService } = await import('@/lib/email/email.service');
      const emailResult = await emailService.send({
        to: user.email!,
        subject: `[DRMS] Daily Signal Digest — ${signals.length} active signals`,
        html,
        text,
      });

      if (emailResult.success) {
        result.sent++;
      } else {
        result.errors++;
      }
    } catch {
      result.errors++;
    }
  }

  return result;
}
