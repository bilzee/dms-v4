const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const signals = await p.actionSignal.findMany({
    where: { resolvedAt: null },
    include: {
      entity: { select: { name: true } },
      incident: { select: { name: true } }
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }]
  });

  console.log('Total unresolved signals:', signals.length);

  const combos = {};
  signals.forEach(sig => {
    const k = `${sig.entityId}|${sig.incidentId || 'null'}|${sig.type}|${sig.signalReason}|${sig.userId}`;
    combos[k] = (combos[k] || 0) + 1;
  });

  const uniqueKeys = Object.keys(combos);
  console.log('Unique combos:', uniqueKeys.length);

  const dups = Object.entries(combos).filter(([, c]) => c > 1);
  console.log('Duplicate combos:', dups.length);
  dups.slice(0, 10).forEach(([k, c]) => console.log(`  x${c}`, k));

  // Group by entityId + type + signalReason (ignoring incidentId) to see cross-incident duplicates
  const crossIncident = {};
  signals.forEach(sig => {
    const k = `${sig.entityId}|${sig.type}|${sig.signalReason}|${sig.userId}`;
    if (!crossIncident[k]) crossIncident[k] = [];
    crossIncident[k].push(sig.incidentId || 'null');
  });
  
  const crossDups = Object.entries(crossIncident).filter(([, v]) => v.length > 1);
  console.log('\nCross-incident duplicates (same entity+type+reason, different incidents):');
  crossDups.slice(0, 10).forEach(([k, incidents]) => console.log(`  ${k} -> incidents: ${incidents.join(', ')}`));

  // Show all signals for a sample entity
  console.log('\nSample: All signals for entity-1 (Maiduguri):');
  signals.filter(s => s.entityId === 'entity-1').forEach(sig =>
    console.log(`  ${sig.type} | ${sig.signalReason} | incident: ${sig.incident?.name || 'NONE'} | user: ${sig.userId.slice(0, 15)}`)
  );

  await p.$disconnect();
})();
