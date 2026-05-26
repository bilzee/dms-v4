import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response';

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    await prisma.$executeRawUnsafe('ANALYZE');

    const tables: any = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    let optimizedCount = 0;
    for (const row of tables) {
      try {
        await prisma.$executeRawUnsafe(`VACUUM ANALYZE "${row.tablename}"`);
        optimizedCount++;
      } catch {
        // Skip tables that can't be vacuumed
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `Optimized ${optimizedCount} tables`,
        tablesOptimized: optimizedCount,
        totalTables: tables.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
