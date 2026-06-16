const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const uid = '091d1388-7f5c-4138-b33a-185dcd416bc1';

(async () => {
  const all = await p.notification.findMany({
    where: { userId: uid, dismissedAt: null },
    take: 15,
    orderBy: { createdAt: 'desc' },
  });
  console.log('Total undismissed:', all.length);

  const now = new Date();
  all.forEach(x => {
    const expired = x.expiresAt < now;
    const read = !!x.readAt;
    console.log(`  [${expired ? 'EXPIRED' : 'ACTIVE'}] [${read ? 'READ' : 'UNREAD'}] ${x.title} | priority: ${x.priority} | expires: ${x.expiresAt.toISOString()}`);
  });

  const unreadActive = all.filter(x => !x.readAt && x.expiresAt >= now);
  console.log('\nUnread & active:', unreadActive.length);

  await p.$disconnect();
})();
