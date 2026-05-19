import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuth } from '@/lib/auth/middleware'
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
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions.' },
      { status: 403 }
    )
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

    return NextResponse.json({
      data: result,
      meta: { timestamp: new Date().toISOString(), version: '1.0.0', requestId: uuidv4() }
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const PUT = withAuth(async (request: NextRequest, context) => {
  const { permissions, userId } = context
  if (!permissions.includes('MANAGE_USERS')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions.' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { section, settings } = body

    if (!section || !settings) {
      return NextResponse.json(
        { success: false, error: 'Section and settings are required.' },
        { status: 400 }
      )
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

    return NextResponse.json({
      data: { success: true },
      meta: { timestamp: new Date().toISOString(), version: '1.0.0', requestId: uuidv4() }
    })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
