import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { successResponse, errorResponse, handleApiError } from '@/lib/api/response'
import { prisma } from '@/lib/db/client'

const SETTINGS_DEFAULTS: Record<string, Record<string, any>> = {
  general: {
    siteName: 'Disaster Management System',
    siteDescription: 'Field assessment and response coordination for Nigeria',
    adminEmail: 'admin@dms.gov.ng',
    timezone: 'Africa/Lagos',
    dateFormat: 'DD/MM/YYYY',
    language: 'en'
  },
  security: {
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    twoFactorEnabled: false
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    criticalAlerts: true,
    weeklyReports: true,
    maintenanceAlerts: true
  },
  backup: {
    autoBackupEnabled: true,
    backupFrequency: 'daily',
    retentionPeriod: 30,
    backupLocation: 'cloud'
  },
  branding: {
    appName: 'DRMS',
    appDescription: 'Comprehensive disaster response management and humanitarian assessment PWA',
    headerIconUrl: '',
    pwaIconUrl: ''
  }
}

function flattenSettings(section: string, values: Record<string, any>) {
  return Object.entries(values).map(([key, value]) => ({
    section,
    key,
    value
  }))
}

export const GET = withAuth(async (request: NextRequest, context) => {
  const { permissions } = context
  if (!permissions.includes('MANAGE_USERS')) {
    return errorResponse('Insufficient permissions.', 403)
  }

  try {
    const savedSettings = await prisma.systemSetting.findMany()
    const settingsMap = new Map(savedSettings.map(s => [`${s.section}.${s.key}`, s.value as any]))

    const result: Record<string, any> = {}
    for (const [section, defaults] of Object.entries(SETTINGS_DEFAULTS)) {
      result[section] = { ...defaults }
      for (const key of Object.keys(defaults)) {
        const saved = settingsMap.get(`${section}.${key}`)
        if (saved !== undefined) {
          result[section][key] = saved
        }
      }
    }

    return successResponse(result)
  } catch (error) {
    console.error('Get settings error:', error)
    return handleApiError(error)
  }
})

export const PUT = withAuth(async (request: NextRequest, context) => {
  const { permissions, userId } = context
  if (!permissions.includes('MANAGE_USERS')) {
    return errorResponse('Insufficient permissions.', 403)
  }

  try {
    const body = await request.json()
    const { section, settings } = body

    if (!section || !settings) {
      return errorResponse('Section and settings are required.', 400)
    }

    const flattened = flattenSettings(section, settings)

    for (const item of flattened) {
      await prisma.systemSetting.upsert({
        where: {
          section_key: { section: item.section, key: item.key }
        },
        create: {
          section: item.section,
          key: item.key,
          value: item.value,
          updatedBy: userId
        },
        update: {
          value: item.value,
          updatedBy: userId
        }
      })
    }

    return successResponse({ success: true })
  } catch (error) {
    console.error('Update settings error:', error)
    return handleApiError(error)
  }
})
