import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { IncidentService } from '@/lib/services/incident.service'

export const GET = withAuth(async (request, context) => {
  try {
    const incidentTypes = await IncidentService.getIncidentTypes()
    
    return NextResponse.json(
      {
        success: true,
        data: incidentTypes,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get incident types error:', error)
    
    // Return default types on error
    const defaultTypes = [
      'Flood',
      'Fire', 
      'Earthquake',
      'Landslide',
      'Drought',
      'Storm',
      'Epidemic',
      'Conflict',
      'Industrial Accident',
      'Other'
    ]
    
    return NextResponse.json(
      {
        success: true,
        data: defaultTypes,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      },
      { status: 200 }
    )
  }
})