import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/response'

// Simple health check that doesn't require database
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown'
    });
  } catch (error) {
    return handleApiError(error)
  }
}