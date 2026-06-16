const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Get the assessor user ID (from the login form: assessor@test.com)
  const assessor = await p.user.findFirst({
    where: { email: 'assessor@test.com' },
    select: { id: true, email: true }
  });
  console.log('Assessor user:', assessor);

  // Get multi-role user
  const multi = await p.user.findFirst({
    where: { email: 'multirole@dms.gov.ng' },
    select: { id: true, email: true }
  });
  console.log('Multi-role user:', multi);

  // Check signals for the assessor user specifically
  if (assessor) {
    const signals = await p.actionSignal.findMany({
      where: { userId: assessor.id, resolvedAt: null },
      include: {
        entity: { select: { name: true } },
        incident: { select: { name: true } }
      }
    });
    console.log(`\nSignals for assessor (${assessor.email}):`, signals.length);
    signals.forEach(s => console.log(`  ${s.entity?.name} | ${s.incident?.name || 'NO-INC'} | ${s.type} | ${s.signalReason}`));
  }

  // Check signals for the multi-role user
  if (multi) {
    const signals = await p.actionSignal.findMany({
      where: { userId: multi.id, resolvedAt: null },
      include: {
        entity: { select: { name: true } },
        incident: { select: { name: true } }
      }
    });
    console.log(`\nSignals for multi-role (${multi.email}):`, signals.length);
    signals.forEach(s => console.log(`  ${s.entity?.name} | ${s.incident?.name || 'NO-INC'} | ${s.type} | ${s.signalReason}`));
  }

  await p.$disconnect();
})();
