const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== 1. DonorCommitment raw data ===')
  const commitments = await prisma.$queryRaw`
    SELECT dc.id, dc.type, dc.status, dc."totalCommittedQuantity", dc."deliveredQuantity", 
      dc."verifiedDeliveredQuantity", dc."totalValueEstimated", dc."donorId", dc."entityId", dc."incidentId",
      dc.items
    FROM donor_commitments dc`
  console.log('Total commitments:', commitments.length)
  for (const c of commitments) {
    console.log(`  [${c.type}] status=${c.status} committed=${c.totalCommittedQuantity} delivered=${c.deliveredQuantity} verified=${c.verifiedDeliveredQuantity} valueEst=${c.totalValueEstimated} items=${JSON.stringify(c.items).substring(0, 200)}`)
  }

  console.log('\n=== 2. All incidents (createdAt check) ===')
  const incidents = await prisma.$queryRaw`
    SELECT i.id, i.name, i.type, i.severity, i.status, i."createdAt", i."updatedAt"
    FROM incidents i
    ORDER BY i."createdAt" DESC`
  for (const inc of incidents) {
    console.log(`  ${inc.name} (${inc.type}/${inc.severity}/${inc.status}) created=${inc.createdAt.toISOString()} updated=${inc.updatedAt.toISOString()}`)
  }

  console.log('\n=== 3. Recent assessments (last 24h) ===')
  const recentAssessments = await prisma.$queryRaw`
    SELECT ra.id, ra."entityId", e.name as entity_name, ra."createdAt", ra."verificationStatus"
    FROM rapid_assessments ra
    JOIN entities e ON e.id = ra."entityId"
    WHERE ra."createdAt" >= NOW() - INTERVAL '24 hours'
    ORDER BY ra."createdAt" DESC`
  console.log('Count:', recentAssessments.length)
  for (const a of recentAssessments) {
    console.log(`  ${a.entity_name} - ${a.verificationStatus} at ${a.createdAt.toISOString()}`)
  }

  console.log('\n=== 4. Recent delivered responses (last 24h) ===')
  const recentDelivered = await prisma.$queryRaw`
    SELECT rr.id, e.name as entity_name, rr."deliveryStatus", rr."createdAt"
    FROM rapid_responses rr
    JOIN entities e ON e.id = rr."entityId"
    WHERE rr."deliveryStatus" = 'DELIVERED'
      AND rr."createdAt" >= NOW() - INTERVAL '24 hours'
    ORDER BY rr."createdAt" DESC`
  console.log('Count:', recentDelivered.length)

  console.log('\n=== 5. Unresolved action signals (last 24h) ===')
  const recentSignals = await prisma.$queryRaw`
    SELECT asig.id, asig."signalReason", e.name as entity_name, asig.created_at, asig.priority
    FROM action_signals asig
    JOIN entities e ON e.id = asig.entity_id
    WHERE asig.resolved_at IS NULL
      AND asig.created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY asig.created_at DESC`
  console.log('Count:', recentSignals.length)
  for (const s of recentSignals) {
    console.log(`  ${s.signalReason} - ${s.entity_name} (${s.priority}) at ${s.created_at.toISOString()}`)
  }

  console.log('\n=== 6. Entity assignments for workload check ===')
  const assignments = await prisma.$queryRaw`
    SELECT ea."userId", u.name as user_name, ea."entityId", e.name as entity_name
    FROM entity_assignments ea
    JOIN users u ON u.id = ea."userId"
    JOIN entities e ON e.id = ea."entityId"`
  console.log('Total assignments:', assignments.length)
  for (const a of assignments) {
    console.log(`  ${a.user_name} -> ${a.entity_name}`)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); prisma.$disconnect() })
