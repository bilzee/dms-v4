const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const r = await prisma.$queryRaw`SELECT type, COUNT(*)::int as cnt FROM rapid_responses GROUP BY type`
  console.log('RapidResponse types:', JSON.stringify(r))
  const d = await prisma.$queryRaw`SELECT type, status, COUNT(*)::int as cnt FROM donor_commitments GROUP BY type, status`
  console.log('DonorCommitment types:', JSON.stringify(d))
  await prisma.$disconnect()
}
main().catch(e => { console.error(e); prisma.$disconnect() })
