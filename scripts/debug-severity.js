const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  // Check GapFieldSeverity table (the actual config driving gap analysis)
  const gapFieldSeverities = await db.gapFieldSeverity.findMany({
    where: { isActive: true },
    orderBy: [{ assessmentType: 'asc' }, { displayName: 'asc' }],
    select: { fieldName: true, assessmentType: true, severity: true, displayName: true }
  });
  console.log('GAP FIELD SEVERITY CONFIG:', gapFieldSeverities.length);
  for (const gf of gapFieldSeverities) {
    console.log('  ', gf.assessmentType, '|', gf.displayName, '|', gf.fieldName, '| severity:', gf.severity);
  }

  // Check distinct priorities in rapid assessments
  const raPriorities = await db.$queryRaw`
    SELECT priority, count(*) as cnt FROM rapid_assessments GROUP BY priority ORDER BY priority
  `;
  console.log('\nRA PRIORITY DISTRIBUTION:');
  for (const r of raPriorities) {
    console.log('  ', r.priority, ':', r.cnt);
  }

  // Check incidents
  const incidents = await db.incident.findMany({
    select: { id: true, name: true, severity: true, type: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log('\nINCIDENTS:');
  for (const i of incidents) {
    const ras = await db.rapidAssessment.findMany({
      where: { incidentId: i.id },
      select: { id: true, priority: true, verificationStatus: true }
    });
    console.log(' ', i.name, '| severity:', i.severity, '| type:', i.type);
    console.log('    RAs:', ras.length, JSON.stringify(ras.map(r => ({ p: r.priority, v: r.verificationStatus }))));
  }
}

main().catch(console.error).finally(() => db.$disconnect());
