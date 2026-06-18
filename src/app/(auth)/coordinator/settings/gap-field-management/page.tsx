'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings, AlertTriangle, Info, ArrowLeft, Heart, UtensilsCrossed, Droplets, Home, Shield, RefreshCw, Loader2 } from '@/lib/icons'
import { useRouter } from 'next/navigation'
import { GapFieldTable } from '@/components/settings/GapFieldTable'
import { toast } from 'sonner'
import { apiPost } from '@/lib/api'

/**
 * Gap Field Management Page
 * 
 * Allows coordinators to manage gap field severity configurations
 * - View all gap fields by assessment type
 * - Edit field severities (MEDIUM, HIGH, CRITICAL) 
 * - Bulk operations for multiple fields
 * - Real-time preview of changes
 * - Audit trail tracking
 */
export default function GapFieldManagementPage() {
  const router = useRouter()
  const [isRecalculating, setIsRecalculating] = useState(false)

  const handleRecalculate = async () => {
    setIsRecalculating(true)
    try {
      const prioritiesRes = await apiPost('/api/v1/rapid-assessments/update-priorities')
      if (!prioritiesRes.success) {
        throw new Error(prioritiesRes.error || 'Failed to update assessment priorities')
      }

      const severityRes = await apiPost('/api/v1/admin/severity/recalculate')
      if (!severityRes.success) {
        throw new Error(severityRes.error || 'Failed to recalculate incident severities')
      }

      toast.success('Recalculation complete', {
        description: `Assessments updated and incident severities recalculated.`,
      })
    } catch (error: any) {
      toast.error('Recalculation failed', {
        description: error.message || 'An unexpected error occurred',
      })
    } finally {
      setIsRecalculating(false)
    }
  }

  const assessmentTypes = [
    { 
      key: 'HEALTH', 
      label: 'Health', 
      icon: Heart, 
      description: 'Medical facilities, staff, supplies, and emergency services'
    },
    { 
      key: 'FOOD', 
      label: 'Food', 
      icon: UtensilsCrossed, 
      description: 'Food sufficiency, distribution, and nutritional support'
    },
    { 
      key: 'WASH', 
      label: 'WASH', 
      icon: Droplets, 
      description: 'Water access, sanitation facilities, and hygiene practices'
    },
    { 
      key: 'SHELTER', 
      label: 'Shelter', 
      icon: Home, 
      description: 'Housing capacity, safety, and weather protection'
    },
    { 
      key: 'SECURITY', 
      label: 'Security', 
      icon: Shield, 
      description: 'Safety measures, protection services, and vulnerability support'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Gap Field Severity Management</h1>
          </div>
          <p className="text-gray-600 hidden sm:block">
            Configure the severity levels for assessment gap fields to customize priority calculations
          </p>
        </div>
      </div>

      {/* Information Panel */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900">How Severity Calculation Works</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Assessment Severity</strong> is determined by the <strong>highest severity</strong> of any gap field marked by assessors.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">LOW</Badge>
              <span className="text-xs">Monitor when convenient</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">MEDIUM</Badge>
              <span className="text-xs">Attention needed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">HIGH</Badge>
              <span className="text-xs">Urgent attention</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-red-100 text-red-800">CRITICAL</Badge>
              <span className="text-xs">Immediate action</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Type Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Gap Field Configuration
          </CardTitle>
          <CardDescription>
            Select an assessment type below to view and modify gap field severities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="HEALTH" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              {assessmentTypes.map((type) => {
                const Icon = type.icon
                return (
                  <TabsTrigger 
                    key={type.key} 
                    value={type.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{type.label}</span>
                    <span className="sm:hidden">{type.key.slice(0, 3)}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {assessmentTypes.map((type) => (
              <TabsContent key={type.key} value={type.key} className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <type.icon className="h-5 w-5" />
                    {type.label}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                </div>
                
                <GapFieldTable assessmentType={type.key} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Recalculate All Card */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-600" />
              <div>
                <CardTitle className="text-base text-orange-900">Recalculate All Assessments</CardTitle>
                <CardDescription className="text-orange-700">
                  Re-run gap analysis on every assessment and update incident severities with the current config
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              variant="default"
              size="sm"
              className="shrink-0"
            >
              {isRecalculating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Recalculating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Recalculate All
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-orange-600 shrink-0" />
            <span className="text-xs text-orange-800">
              This re-computes the gap analysis and priority for all assessments using the current field severity settings above, then updates incident severity. Use this after bulk changes to ensure the Situation Dashboard reflects the latest configuration.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Severity Recommendations</h4>
              <ul className="space-y-1">
                <li><strong>CRITICAL:</strong> Life-threatening gaps (medical emergencies, water shortage)</li>
                <li><strong>HIGH:</strong> Urgent needs affecting large populations</li>
                <li><strong>MEDIUM:</strong> Important but manageable gaps</li>
                <li><strong>LOW:</strong> Minor issues for monitoring</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Impact of Changes</h4>
              <ul className="space-y-1">
                <li>• Changes apply immediately to new assessments</li>
                <li>• Existing gap analysis recalculated dynamically</li>
                <li>• Dashboard priorities update in real-time</li>
                <li>• All changes are logged for audit trail</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}