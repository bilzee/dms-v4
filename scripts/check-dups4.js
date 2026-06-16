const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const uid = '091d1388-7f5c-4138-b33a-185dcd416bc1';

(async () => {
  const count = await p.actionSignal.count({ where: { userId: uid, resolvedAt: null } });
  console.log('Count now:', count);

  const all = await p.actionSignal.findMany({
    where: { userId: uid, resolvedAt: null },
    select: { id: true, entityId: true, incidentId: true, type: true, signalReason: true }
  });

  const seen = new Map();
  all.forEach(s => {
    const k = `${s.entityId}|${s.incidentId}|${s.type}|${s.signalReason}`;
    if (seen.has(k)) {
      console.log('DUP:', k, 'old:', seen.get(k), 'new:', s.id);
    } else {
      seen.set(k, s.id);
    }
  });
  console.log('Unique:', seen.size, 'Total:', all.length);

  // Check if the unique constraint was violated
  console.log('\nAll signals:');
  all.forEach(s => console.log(`  ${s.id.slice(0,8)} ${s.entityId}|${s.incidentId}|${s.type}|${s.signalReason}`));

  await p.$disconnect();
})();
