'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { apiGet, apiPut } from '@/lib/api'
import { 
  Settings, 
  Globe, 
  Mail, 
  Shield, 
  Database, 
  Bell,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from '@/lib/icons'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'

interface SystemSettings {
  general: {
    siteName: string
    siteDescription: string
    adminEmail: string
    timezone: string
    dateFormat: string
    language: string
  }
  security: {
    passwordMinLength: number
    passwordRequireSpecialChars: boolean
    sessionTimeout: number
    maxLoginAttempts: number
    twoFactorEnabled: boolean
  }
  notifications: {
    emailNotifications: boolean
    smsNotifications: boolean
    criticalAlerts: boolean
    weeklyReports: boolean
    maintenanceAlerts: boolean
  }
  backup: {
    autoBackupEnabled: boolean
    backupFrequency: string
    retentionPeriod: number
    backupLocation: string
  }
}

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<SystemSettings>({
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
  })
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const { hasPermission } = useAuth()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await apiGet('/api/v1/system/settings')
        if (result.success && result.data) {
          setSettings(result.data)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setSettingsLoaded(true)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async (section: keyof SystemSettings) => {
    setIsLoading(true)
    setSaveStatus('saving')

    try {
      const result = await apiPut('/api/v1/system/settings', {
        section,
        settings: settings[section]
      })

      if (result.success) {
        setSaveStatus('success')
      } else {
        throw new Error(result.error || 'Failed to save settings')
      }

      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = (section: keyof SystemSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  if (!hasPermission('MANAGE_USERS')) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You don&apos;t have permission to access system settings.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <RoleBasedRoute requiredRole="ADMIN" fallbackPath="/dashboard">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">System Settings</h1>
            <p className="text-muted-foreground">Configure system-wide parameters and preferences</p>
          </div>
        </div>

        {/* Save Status Alert */}
        {saveStatus !== 'idle' && (
          <Alert className={saveStatus === 'success' ? 'border-green-200 bg-green-50' : saveStatus === 'error' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}>
            <div className="flex items-center">
              {saveStatus === 'saving' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {saveStatus === 'success' && <CheckCircle className="h-4 w-4 mr-2 text-green-600" />}
              {saveStatus === 'error' && <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />}
              <AlertDescription>
                {saveStatus === 'saving' && 'Saving settings...'}
                {saveStatus === 'success' && 'Settings saved successfully!'}
                {saveStatus === 'error' && 'Failed to save settings. Please try again.'}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="mr-2 h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  Basic system configuration and site information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={settings.general.siteName}
                      onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={settings.general.adminEmail}
                      onChange={(e) => updateSetting('general', 'adminEmail', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={settings.general.timezone} onValueChange={(value) => updateSetting('general', 'timezone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select value={settings.general.dateFormat} onValueChange={(value) => updateSetting('general', 'dateFormat', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={settings.general.siteDescription}
                    onChange={(e) => updateSetting('general', 'siteDescription', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSave('general')}
                    disabled={isLoading}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? 'Saving...' : 'Save General Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Password policies and security configurations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={settings.security.passwordMinLength}
                      onChange={(e) => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))}
                      min={6}
                      max={20}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
                      min={3}
                      max={10}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                      min={5}
                      max={120}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Special Characters in Password</Label>
                      <p className="text-sm text-muted-foreground">Passwords must include special characters</p>
                    </div>
                    <Switch
                      checked={settings.security.passwordRequireSpecialChars}
                      onCheckedChange={(checked) => updateSetting('security', 'passwordRequireSpecialChars', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                    </div>
                    <Switch
                      checked={settings.security.twoFactorEnabled}
                      onCheckedChange={(checked) => updateSetting('security', 'twoFactorEnabled', checked)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSave('security')}
                    disabled={isLoading}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? 'Saving...' : 'Save Security Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure system notifications and alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send notifications via email</p>
                    </div>
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onCheckedChange={(checked) => updateSetting('notifications', 'emailNotifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send critical alerts via SMS</p>
                    </div>
                    <Switch
                      checked={settings.notifications.smsNotifications}
                      onCheckedChange={(checked) => updateSetting('notifications', 'smsNotifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Critical Alerts</Label>
                      <p className="text-sm text-muted-foreground">Immediate notifications for critical events</p>
                    </div>
                    <Switch
                      checked={settings.notifications.criticalAlerts}
                      onCheckedChange={(checked) => updateSetting('notifications', 'criticalAlerts', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">Send weekly activity reports</p>
                    </div>
                    <Switch
                      checked={settings.notifications.weeklyReports}
                      onCheckedChange={(checked) => updateSetting('notifications', 'weeklyReports', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Maintenance Alerts</Label>
                      <p className="text-sm text-muted-foreground">Notify about system maintenance</p>
                    </div>
                    <Switch
                      checked={settings.notifications.maintenanceAlerts}
                      onCheckedChange={(checked) => updateSetting('notifications', 'maintenanceAlerts', checked)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSave('notifications')}
                    disabled={isLoading}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Backup Settings
                </CardTitle>
                <CardDescription>
                  Configure automatic backup and recovery options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="backupFrequency">Backup Frequency</Label>
                    <Select value={settings.backup.backupFrequency} onValueChange={(value) => updateSetting('backup', 'backupFrequency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="retentionPeriod">Retention Period (days)</Label>
                    <Input
                      id="retentionPeriod"
                      type="number"
                      value={settings.backup.retentionPeriod}
                      onChange={(e) => updateSetting('backup', 'retentionPeriod', parseInt(e.target.value))}
                      min={1}
                      max={365}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Automatic Backup</Label>
                      <p className="text-sm text-muted-foreground">Enable automatic system backups</p>
                    </div>
                    <Switch
                      checked={settings.backup.autoBackupEnabled}
                      onCheckedChange={(checked) => updateSetting('backup', 'autoBackupEnabled', checked)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="backupLocation">Backup Location</Label>
                    <Select value={settings.backup.backupLocation} onValueChange={(value) => updateSetting('backup', 'backupLocation', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local Storage</SelectItem>
                        <SelectItem value="cloud">Cloud Storage</SelectItem>
                        <SelectItem value="hybrid">Hybrid (Local + Cloud)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Backup Status */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-2">Last Backup Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Last Backup:</span>
                      <Badge variant="outline">2 hours ago</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge variant="default">Successful</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Size:</span>
                      <span>245 MB</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Test Backup
                  </Button>
                  <Button 
                    onClick={() => handleSave('backup')}
                    disabled={isLoading}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? 'Saving...' : 'Save Backup Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedRoute>
  )
}