const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== Testing individual queries ===\n')

  try {
    console.log('1. Throughput - assessment turnaround...')
    const from7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const r1 = await prisma.$queryRaw`
      SELECT DATE(ra."verifiedAt") as date,
        AVG(EXTRACT(EPOCH FROM (ra."verifiedAt" - ra."createdAt")) / 3600)::float as avg_hours
      FROM rapid_assessments ra
      WHERE ra."verifiedAt" IS NOT NULL
        AND ra."createdAt" >= ${from7d}
        AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
      GROUP BY DATE(ra."verifiedAt")
      ORDER BY date ASC`
    console.log('  Result:', JSON.stringify(r1))
  } catch(e) { console.log('  ERROR:', e.message) }

  try {
    console.log('\n2. Throughput without date filter...')
    const r2 = await prisma.$queryRaw`
      SELECT DATE(ra."verifiedAt") as date,
        AVG(EXTRACT(EPOCH FROM (ra."verifiedAt" - ra."createdAt")) / 3600)::float as avg_hours
      FROM rapid_assessments ra
      WHERE ra."verifiedAt" IS NOT NULL
        AND ra."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED')
      GROUP BY DATE(ra."verifiedAt")
      ORDER BY date ASC`
    console.log('  Result:', JSON.stringify(r2))
  } catch(e) { console.log('  ERROR:', e.message) }

  try {
    console.log('\n3. Assessment freshness (CROSS JOIN)...')
    const r3 = await prisma.$queryRaw`
      SELECT e.id as entity_id, e.name as entity_name, e.type as entity_type,
        atype.assessment_type,
        MAX(ra."createdAt") as last_assessed,
        EXTRACT(EPOCH FROM (NOW() - MAX(ra."createdAt"))) / 3600 as hours_ago
      FROM entities e
      CROSS JOIN (VALUES ('HEALTH'),('WASH'),('SHELTER'),('FOOD'),('SECURITY'),('POPULATION')) as atype(assessment_type)
      LEFT JOIN rapid_assessments ra ON ra."entityId" = e.id
        AND ra."rapidAssessmentType" = atype.assessment_type
        AND ra."verificationStatus" IN ('VERIFIED','AUTO_VERIFIED','SUBMITTED')
      WHERE e."isActive" = true
      GROUP BY e.id, e.name, e.type, atype.assessment_type
      ORDER BY e.name, atype.assessment_type
      LIMIT 5`
    console.log('  Result:', JSON.stringify(r3))
  } catch(e) { console.log('  ERROR:', e.message) }

  try {
    console.log('\n4. Live pulse - severity timeline...')
    const from7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const r4 = await prisma.$queryRaw`
      SELECT DATE(i."updatedAt") as date, i.severity
      FROM incidents i
      WHERE i."createdAt" >= ${from7d}
      ORDER BY date ASC`
    console.log('  Result:', JSON.stringify(r4))
  } catch(e) { console.log('  ERROR:', e.message) }

  try {
    console.log('\n5. Live pulse - incidents count (all)...')
    const r5 = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM incidents`
    console.log('  Total incidents:', JSON.stringify(r5))
  } catch(e) { console.log('  ERROR:', e.message) }

  try {
    console.log('\n6. Rapid assessments - verifiedAt check...')
    const r6 = await prisma.$queryRaw`
      SELECT "verificationStatus", COUNT(*)::int as cnt, 
        MIN("verifiedAt") as min_verified, MAX("verifiedAt") as max_verified,
        MIN("createdAt") as min_created, MAX("createdAt") as max_created
      FROM rapid_assessments GROUP BY "verificationStatus"`
    console.log('  Result:', JSON.stringify(r6, (k,v) => typeof v === 'bigint' ? Number(v) : v))
  } catch(e) { console.log('  ERROR:', e.message) }

  try {
    console.log('\n7. Population trend...')
    const r7 = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM preliminary_assessments`
    console.log('  Total preliminary_assessments:', JSON.stringify(r7))
  } catch(e) { console.log('  ERROR:', e.message) }

  try {
    console.log('\n8. Population demographics...')
    const r8 = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM population_assessments`
    console.log('  Total population_assessments:', JSON.stringify(r8))
  } catch(e) { console.log('  ERROR:', e.message) }

  try {
    console.log('\n9. Rapid responses - verifiedAt check...')
    const r9 = await prisma.$queryRaw`
      SELECT "verificationStatus", COUNT(*)::int as cnt,
        MIN("verifiedAt") as min_verified, MAX("verifiedAt") as max_verified
      FROM rapid_responses GROUP BY "verificationStatus"`
    console.log('  Result:', JSON.stringify(r9, (k,v) => typeof v === 'bigint' ? Number(v) : v))
  } catch(e) { console.log('  ERROR:', e.message) }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); prisma.$disconnect() })
