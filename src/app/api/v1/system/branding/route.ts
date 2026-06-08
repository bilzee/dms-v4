import { successResponse, handleApiError } from '@/lib/api/response'
import { prisma } from '@/lib/db/client'
import { NextRequest } from 'next/server'

const BRANDING_DEFAULTS = {
  appName: 'DRMS',
  appDescription: 'Comprehensive disaster response management and humanitarian assessment PWA',
  headerIconUrl: '',
  pwaIconUrl: '',
}

export async function GET(_request: NextRequest) {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { section: 'branding' },
    })
    const map = new Map(settings.map(s => [s.key, s.value as string]))

    return successResponse({
      appName: map.get('appName') || BRANDING_DEFAULTS.appName,
      appDescription: map.get('appDescription') || BRANDING_DEFAULTS.appDescription,
      headerIconUrl: map.get('headerIconUrl') || '',
      pwaIconUrl: map.get('pwaIconUrl') || '',
    })
  } catch (error) {
    return successResponse(BRANDING_DEFAULTS)
  }
}
