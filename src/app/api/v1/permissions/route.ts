import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

// Get all permissions - requires MANAGE_USERS or ASSIGN_ROLES permission
export const GET = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context;
  if (!permissions.includes('MANAGE_USERS') && !permissions.includes('ASSIGN_ROLES')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Manage users or Assign roles permission required.' },
      { status: 403 }
    );
  }

  try {
    const permissions = await prisma.permission.findMany({
      include: {
        roles: {
          include: {
            role: true
          }
        }
      },
      orderBy: { category: 'asc' }
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          permissions
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get permissions error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          requestId: uuidv4()
        }
      },
      { status: 500 }
    )
  }
})