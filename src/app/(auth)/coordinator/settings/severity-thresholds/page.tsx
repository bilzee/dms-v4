'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Settings, AlertTriangle, Info, ArrowLeft, Users, TrendingDown } from '@/lib/icons'
import { useRouter } from 'next/navigation'
import { SeverityThresholdTable } from '@/components/settings/SeverityThresholdTable'

/**
 * Severity Threshold Management Page
 * 
 * Allows coordinators to configure severity thresholds for impact badges
 * - Population Impact thresholds (verified data)
 * - Preliminary Impact thresholds (estimated data)
 * - Real-time preview of changes
 * - Audit trail tracking
 */
export default function SeverityThresholdsPage() {
  const router = useRouter()

  const impactTypes = [
    { 
      key: 'POPULATION', 
      label: 'Population Impact', 
      icon: Users, 
      description: 'Verified population impact data from Population Assessments'
    },
    { 
      key: 'PRELIMINARY', 
      label: 'Preliminary Impact', 
      icon: TrendingDown, 
      description: 'Estimated impact data from Preliminary Assessments'
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
            <h1 className="text-2xl font-bold text-gray-900">Severity Threshold Management</h1>
          </div>
          <p className="text-gray-600 hidden sm:block">
            Configure the severity thresholds for impact badges in the Situation Dashboard
          </p>
        </div>
      </div>

      {/* Information Panel */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900">How Severity Badges Work</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Impact severity badges</strong> are calculated based on casualty numbers, displacement, and other impact metrics.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">LOW</Badge>
              <span className="text-xs">Minimal or no casualties</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">MEDIUM</Badge>
              <span className="text-xs">Some casualties/displacement</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">HIGH</Badge>
              <span className="text-xs">Significant casualties</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-red-100 text-red-800">CRITICAL</Badge>
              <span className="text-xs">Mass casualties/displacement</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impact Type Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Severity Threshold Configuration
          </CardTitle>
          <CardDescription>
            Select an impact type below to view and modify severity thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="POPULATION" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              {impactTypes.map((type) => {
                const Icon = type.icon
                return (
                  <TabsTrigger 
                    key={type.key} 
                    value={type.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{type.label}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {impactTypes.map((type) => {
              const Icon = type.icon
              return (
                <TabsContent key={type.key} value={type.key} className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {type.label}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  </div>
                  
                  <SeverityThresholdTable impactType={type.key} />
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Population Impact Thresholds</h4>
              <ul className="space-y-1">
                <li><strong>Lives Lost:</strong> Number of confirmed fatalities</li>
                <li><strong>Injured:</strong> Number of confirmed injured persons</li>
                <li><strong>Source:</strong> Verified Population Assessment data</li>
                <li><strong>Usage:</strong> &quot;Casualty Impact&quot; badge in dashboard</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Preliminary Impact Thresholds</h4>
              <ul className="space-y-1">
                <li><strong>Lives Lost:</strong> Estimated fatalities</li>
                <li><strong>Injured:</strong> Estimated injured persons</li>
                <li><strong>Displaced:</strong> Number of displaced persons</li>
                <li><strong>Source:</strong> Preliminary Assessment estimates</li>
                <li><strong>Usage:</strong> &quot;Human Impact (Estimates)&quot; badge</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}