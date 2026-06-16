const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const assessorId = '091d1388-7f5c-4138-b33a-185dcd416bc1';

  const signals = await p.actionSignal.findMany({
    where: { userId: assessorId, resolvedAt: null },
    include: {
      entity: { select: { name: true } },
      incident: { select: { name: true } }
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
  });

  console.log('Total for assessor:', signals.length);

  const seen = new Map();
  signals.forEach((sig, i) => {
    const key = `${sig.entityId}|${sig.incidentId}|${sig.type}|${sig.signalReason}`;
    const existing = seen.get(key);
    if (existing) {
      console.log(`DUPLICATE #${i}: ${key}`);
      console.log(`  First id: ${existing.id}`);
      console.log(`  Dup  id: ${sig.id}`);
      console.log(`  Same id? ${existing.id === sig.id}`);
    } else {
      seen.set(key, sig);
    }
    console.log(`[${i}] ${sig.entity?.name} | ${sig.incident?.name || 'NO-INC'} | ${sig.type} | ${sig.signalReason} | id:${sig.id.slice(0,8)}`);
  });

  // Check total unresolved
  const total = await p.actionSignal.count({ where: { resolvedAt: null } });
  console.log('\nTotal unresolved signals in DB:', total);

  await p.$disconnect();
})();
