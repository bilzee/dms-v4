import { NextRequest, NextResponse } from 'next/server';
import { entityService } from '@/lib/services/entity.service';
import { withAuth, AuthContext } from '@/lib/auth/middleware';

// Prevent static generation during build
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/entities/public
 * Endpoint to get all entities - restricted to COORDINATOR and ADMIN roles
 */
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    // Check for COORDINATOR or ADMIN role
    if (!context.roles.includes('COORDINATOR') && !context.roles.includes('ADMIN')) {
      return NextResponse.json(
        { error: 'Insufficient permissions', message: 'COORDINATOR or ADMIN role required' },
        { status: 403 }
      );
    }

    // Skip database calls during Docker build phase
    if (process.env.NEXT_BUILD === "true") {
      return NextResponse.json({ success: true, data: [] });
    }

    const result = await entityService.getAllEntities();

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, errors: result.errors },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching public entities:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      { status: 500 }
    );
  }
});
