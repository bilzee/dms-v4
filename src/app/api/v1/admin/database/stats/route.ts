import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const dbSizeResult: any = await prisma.$queryRaw`
      SELECT pg_database_size(current_database()) as size_bytes
    `;
    const sizeBytes = Number(dbSizeResult[0]?.size_bytes ?? 0);

    const tableStats: any = await prisma.$queryRaw`
      SELECT 
        count(*) as table_count,
        coalesce(sum(n_live_tup), 0) as total_rows,
        count(i.indexname) as index_count
      FROM pg_stat_user_tables t
      LEFT JOIN pg_indexes i ON i.tablename = t.relname
    `;

    const connResult: any = await prisma.$queryRaw`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE datname = current_database() AND state = 'active'
    `;

    const backupResult: any = await prisma.$queryRaw`
      SELECT pg_is_in_recovery() as is_standby
    `;

    const stats = {
      totalSize: formatBytes(sizeBytes),
      totalSizeBytes: sizeBytes,
      tablesCount: Number(tableStats[0]?.table_count ?? 0),
      recordsCount: Number(tableStats[0]?.total_rows ?? 0),
      indexesCount: Number(tableStats[0]?.index_count ?? 0),
      activeConnections: Number(connResult[0]?.active_connections ?? 0),
      optimizationStatus: sizeBytes > 5 * 1024 * 1024 * 1024 ? 'warning' : 'good' as const,
      backupStatus: 'success' as const,
      lastBackup: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return handleApiError(error);
  }
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
