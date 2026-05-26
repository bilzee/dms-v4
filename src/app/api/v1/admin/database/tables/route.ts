import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { handleApiError } from '@/lib/api/response';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const tables: any = await prisma.$queryRaw`
      SELECT 
        s.relname as name,
        COALESCE(s.n_live_tup, 0) as records,
        pg_total_relation_size((quote_ident(s.schemaname) || '.' || quote_ident(s.relname))::regclass) as size_bytes,
        COALESCE(s.last_autovacuum, s.last_analyze) as last_modified,
        EXISTS (
          SELECT 1 FROM pg_indexes i WHERE i.tablename = s.relname AND i.schemaname = s.schemaname LIMIT 1
        ) as has_indexes
      FROM pg_stat_user_tables s
      ORDER BY pg_total_relation_size((quote_ident(s.schemaname) || '.' || quote_ident(s.relname))::regclass) DESC
    `;

    const data = tables.map((row: any) => ({
      name: row.name,
      records: Number(row.records),
      size: formatBytes(Number(row.size_bytes)),
      sizeBytes: Number(row.size_bytes),
      lastModified: row.last_modified ? new Date(row.last_modified).toISOString() : null,
      hasIndexes: Boolean(row.has_indexes),
    }));

    return NextResponse.json({ success: true, data });
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
