import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response';

const QuerySchema = z.object({
  query: z.string().min(1).max(5000),
});

const FORBIDDEN_PATTERNS = [
  /\bDROP\b/i, /\bTRUNCATE\b/i, /\bDELETE\s+FROM\b/i,
  /\bALTER\b/i, /\bGRANT\b/i, /\bREVOKE\b/i,
  /\bCREATE\s+USER\b/i, /\bINSERT\s+INTO\b/i, /\bUPDATE\b/i,
];

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    if (!context.roles.includes('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { query } = QuerySchema.parse(body);

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(query)) {
        return NextResponse.json(
          { success: false, error: 'Only SELECT queries are allowed for safety' },
          { status: 400 }
        );
      }
    }

    if (!/^\s*SELECT\b/i.test(query)) {
      return NextResponse.json(
        { success: false, error: 'Only SELECT queries are permitted' },
        { status: 400 }
      );
    }

    const limitedQuery = query.includes('LIMIT') ? query : `${query.replace(/;$/, '')} LIMIT 100`;

    const results = await prisma.$queryRawUnsafe(limitedQuery);

    return NextResponse.json({
      success: true,
      data: {
        results,
        rowCount: Array.isArray(results) ? results.length : 0,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
