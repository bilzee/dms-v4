import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'

export const POST = withAuth(async (request, context) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // We could implement a token blacklist here if needed
    
    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Logout successful'
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
    console.error('Logout error:', error)
    
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