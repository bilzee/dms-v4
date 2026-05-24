'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  FileText, 
  Calendar,
  Building,
  Users,
  BarChart3,
  TrendingUp,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Filter,
  Eye,
  Printer,
  Share2,
  Save
} from 'lucide-react'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { apiGet, getAuthHeaders } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface EntityData {
  id: string
  name: string
  type: string
  location?: string
  demographics?: {
    population?: number
    vulnerableCount?: number
    lga?: string
  }
  stats?: {
    verifiedAssessments: number
    responses: number
    commitments: number
  }
}

interface ReportConfig {
  format: 'pdf' | 'csv' | 'excel'
  includeCharts: boolean
  includeTrends: boolean
  includeGapAnalysis: boolean
  dateRange: '7d' | '30d' | '90d' | '1y'
  entities: string[]
}

export default function DonorReportsPage() {
  const { currentRole, user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    format: 'pdf',
    includeCharts: true,
    includeTrends: true,
    includeGapAnalysis: true,
    dateRange: '30d',
    entities: []
  })
  const [isGenerating, setIsGenerating] = useState(false)

  // Fetch all entities assigned to donor
  const { data: entitiesData, isLoading: entitiesLoading } = useQuery({
    queryKey: ['donor-entities-reports'],
    queryFn: async () => {
      try {
        const result = await apiGet('/api/v1/donors/entities?limit=100')
        if (!result.success) {
          console.warn('Entities API returned:', result.error)
          return [] // Return empty array instead of throwing error
        }
        return result.data?.entities as EntityData[] || []
      } catch (error) {
        console.warn('Failed to fetch entities:', error)
        return [] // Return empty array on error
      }
    }
  })

  const entities = entitiesData || []

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      // Note: Report generation returns a blob, so we keep raw fetch for the blob response
      const response = await fetch('/api/v1/donors/reports/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          format: reportConfig.format === 'excel' ? 'xlsx' : reportConfig.format,
          includeCharts: reportConfig.includeCharts,
          includeTrends: reportConfig.includeTrends,
          includeGapAnalysis: reportConfig.includeGapAnalysis,
          dateRange: reportConfig.dateRange,
          entityIds: reportConfig.entities.length > 0
            ? reportConfig.entities
            : entities.map(e => e.id)
        })
      })

      if (!response.ok) throw new Error('Report generation failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const fileExt = reportConfig.format === 'excel' ? 'xlsx' : reportConfig.format
      a.download = `donor-report-${new Date().toISOString().split('T')[0]}.${fileExt}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEntityToggle = (entityId: string) => {
    setReportConfig(prev => ({
      ...prev,
      entities: prev.entities.includes(entityId)
        ? prev.entities.filter(id => id !== entityId)
        : [...prev.entities, entityId]
    }))
  }

  const handleSelectAllEntities = () => {
    setReportConfig(prev => ({
      ...prev,
      entities: prev.entities.length === entities.length ? [] : entities.map(e => e.id)
    }))
  }

  if (entitiesLoading) {
    return (
      <RoleBasedRoute requiredRole="DONOR">
        <div className="py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </RoleBasedRoute>
    )
  }

  return (
    <RoleBasedRoute requiredRole="DONOR">
      <div className="py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Donor Reports</h1>
            <p className="text-gray-600 mt-2">
              Generate comprehensive reports for your donor activities and impact
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        <StatCardGrid columns={4} gap="lg">
          <StatCard label="Assigned Entities" value={entities.length} severity="info" icon={Building} />
          <StatCard label="Total Population" value={entities.reduce((total, entity) => total + (entity.demographics?.population || 0), 0).toLocaleString()} severity="info" icon={Users} />
          <StatCard label="Total Assessments" value={entities.reduce((total, entity) => total + (entity.stats?.verifiedAssessments || 0), 0)} severity="info" icon={FileText} />
          <StatCard label="Active Commitments" value={entities.reduce((total, entity) => total + (entity.stats?.commitments || 0), 0)} severity="success" icon={BarChart3} />
        </StatCardGrid>

        {/* Report Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Report Configuration
              </CardTitle>
              <CardDescription>
                Customize your report settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Format */}
              <div>
                <label className="text-sm font-medium mb-2 block">Report Format</label>
                <div className="space-y-2">
                  {(['pdf', 'csv', 'excel'] as const).map((format) => (
                    <Button
                      key={format}
                      variant={reportConfig.format === format ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setReportConfig(prev => ({ ...prev, format }))}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {format.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Select
                  value={reportConfig.dateRange}
                  onValueChange={(value) => setReportConfig(prev => ({ 
                    ...prev, 
                    dateRange: value as ReportConfig['dateRange'] 
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Report Content */}
              <div>
                <label className="text-sm font-medium mb-2 block">Report Content</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={reportConfig.includeCharts}
                      onCheckedChange={(checked) => setReportConfig(prev => ({ 
                        ...prev, 
                        includeCharts: checked as boolean 
                      }))}
                    />
                    <span className="text-sm">Include Charts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={reportConfig.includeTrends}
                      onCheckedChange={(checked) => setReportConfig(prev => ({ 
                        ...prev, 
                        includeTrends: checked as boolean 
                      }))}
                    />
                    <span className="text-sm">Include Trends Analysis</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={reportConfig.includeGapAnalysis}
                      onCheckedChange={(checked) => setReportConfig(prev => ({ 
                        ...prev, 
                        includeGapAnalysis: checked as boolean 
                      }))}
                    />
                    <span className="text-sm">Include Gap Analysis</span>
                  </label>
                </div>
              </div>

              {/* Generate Report Button */}
              <Button 
                className="w-full"
                onClick={handleGenerateReport}
                disabled={isGenerating || entities.length === 0}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Entity Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Select Entities</CardTitle>
                  <CardDescription>
                    Choose which entities to include in your report
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllEntities}
                >
                  {reportConfig.entities.length === entities.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {entities.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {entities.map((entity) => (
                    <button
                      type="button"
                      key={entity.id}
                      className={`text-left w-full p-4 border rounded-lg cursor-pointer transition-colors ${
                        reportConfig.entities.includes(entity.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleEntityToggle(entity.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={reportConfig.entities.includes(entity.id)}
                            onCheckedChange={() => handleEntityToggle(entity.id)}
                            className="mt-1"
                          />
                          <div>
                            <p className="font-medium">{entity.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{entity.type}</Badge>
                              {entity.location && (
                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {entity.location}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              <div className="grid grid-cols-3 gap-4">
                                <span>
                                  <strong>Population:</strong> {entity.demographics?.population?.toLocaleString() || 'N/A'}
                                </span>
                                <span>
                                  <strong>Assessments:</strong> {entity.stats?.verifiedAssessments || 0}
                                </span>
                                <span>
                                  <strong>Commitments:</strong> {entity.stats?.commitments || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {reportConfig.entities.includes(entity.id) && (
                          <Badge variant="default">Selected</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Entities Available</h3>
                  <p className="text-gray-600 mb-4">
                    You need assigned entities to generate reports
                  </p>
                  <Button onClick={() => router.push('/donor/entities')}>
                    View Entities
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Quick Report Templates
            </CardTitle>
            <CardDescription>
              Pre-configured reports for common use cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => {
                  setReportConfig({
                    format: 'pdf',
                    includeCharts: true,
                    includeTrends: true,
                    includeGapAnalysis: true,
                    dateRange: '30d',
                    entities: entities.map(e => e.id)
                  })
                }}
              >
                <FileText className="h-6 w-6 mb-2" />
                Complete Impact Report
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => {
                  setReportConfig({
                    format: 'pdf',
                    includeCharts: true,
                    includeTrends: false,
                    includeGapAnalysis: true,
                    dateRange: '90d',
                    entities: entities.map(e => e.id)
                  })
                }}
              >
                <AlertTriangle className="h-6 w-6 mb-2" />
                Gap Analysis Report
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => {
                  setReportConfig({
                    format: 'csv',
                    includeCharts: false,
                    includeTrends: true,
                    includeGapAnalysis: false,
                    dateRange: '1y',
                    entities: entities.map(e => e.id)
                  })
                }}
              >
                <TrendingUp className="h-6 w-6 mb-2" />
                Performance Metrics CSV
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => {
                  setReportConfig({
                    format: 'pdf',
                    includeCharts: false,
                    includeTrends: true,
                    includeGapAnalysis: false,
                    dateRange: '7d',
                    entities: []
                  })
                }}
              >
                <Calendar className="h-6 w-6 mb-2" />
                Weekly Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleBasedRoute>
  )
}