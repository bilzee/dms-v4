const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const uid = '091d1388-7f5c-4138-b33a-185dcd416bc1';

(async () => {
  const signal = await p.actionSignal.findFirst({
    where: { userId: uid, resolvedAt: null },
  });

  if (!signal) {
    console.log('No active signal found');
    await p.$disconnect();
    return;
  }

  const notif = await p.notification.create({
    data: {
      userId: uid,
      signalId: signal.id,
      title: 'Assessment needed',
      body: 'Gwoza Local Government requires a POPULATION assessment (CRITICAL)',
      priority: 'CRITICAL',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  console.log('Created notification:', notif.id, notif.title, 'expires:', notif.expiresAt.toISOString());
  await p.$disconnect();
})();
