'use client'

import React from 'react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createAuthenticatedFetch } from '@/lib/auth/token-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Download, 
  FileText, 
  Calendar,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Settings
} from 'lucide-react'

interface AssessmentExportProps {
  entityId: string
  entityName: string
  latestAssessments: any[]
  expanded?: boolean
}

interface ExportRequest {
  format: 'pdf' | 'csv'
  categories?: string[]
  timeframe?: string
  includeCharts?: boolean
  includeGapAnalysis?: boolean
  includeTrends?: boolean
}

const ASSESSMENT_CATEGORIES = [
  { value: 'HEALTH', label: 'Health' },
  { value: 'WASH', label: 'Water & Sanitation' },
  { value: 'SHELTER', label: 'Shelter' },
  { value: 'FOOD', label: 'Food Security' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'POPULATION', label: 'Population' }
]

const TIMEFRAME_OPTIONS = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
  { value: 'all', label: 'All Time' }
]

export function AssessmentExport({ entityId, entityName, latestAssessments, expanded = false }: AssessmentExportProps) {
  const [exportRequest, setExportRequest] = useState<ExportRequest>({
    format: 'pdf',
    categories: [],
    timeframe: 'all',
    includeCharts: false,
    includeGapAnalysis: true,
    includeTrends: true
  })
  
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<{
    status: 'idle' | 'generating' | 'ready' | 'error'
    message?: string
    downloadUrl?: string
  }>({ status: 'idle' })

  const handleFormatChange = (format: 'pdf' | 'csv') => {
    setExportRequest(prev => ({ ...prev, format }))
  }

  const handleCategoryToggle = (category: string, checked: boolean) => {
    setExportRequest(prev => {
      const categories = checked 
        ? [...(prev.categories || []), category]
        : (prev.categories || []).filter(c => c !== category)
      
      // If all categories selected, clear the array to include all
      if (categories.length === ASSESSMENT_CATEGORIES.length) {
        return { ...prev, categories: [] }
      }
      
      return { ...prev, categories }
    })
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportStatus({ status: 'generating', message: 'Generating report...' })

    try {
      const response = await createAuthenticatedFetch(`/api/v1/donors/entities/${entityId}/reports/export`, {
        method: 'POST',
        body: JSON.stringify(exportRequest),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate report')
      }

      const data = await response.json()
      
      // In a real implementation, you would create a download link
      // For now, we'll simulate the download process
      setTimeout(() => {
        setExportStatus({
          status: 'ready',
          message: 'Report generated successfully!',
          downloadUrl: data.data.downloadUrl
        })
        setIsExporting(false)
      }, 2000)

    } catch (error) {
      console.error('Export error:', error)
      setExportStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to generate report'
      })
      setIsExporting(false)
    }
  }

  const handleDownload = () => {
    if (exportStatus.downloadUrl) {
      // In a real implementation, this would trigger the actual download
      window.open(exportStatus.downloadUrl, '_blank')
    }
  }

  // Check if all categories are selected
  const allCategoriesSelected = exportRequest.categories?.length === 0 || 
    exportRequest.categories?.length === ASSESSMENT_CATEGORIES.length

  // Get available categories from latest assessments
  const availableCategories = new Set(latestAssessments.map(a => a.type))

  return (
    <div className={`${expanded ? 'space-y-6' : 'space-y-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`font-semibold ${expanded ? 'text-lg' : 'text-base'}`}>Export Assessment Reports</h3>
          <p className="text-sm text-gray-600">
            Generate comprehensive reports for {entityName}
          </p>
        </div>
        <Download className="h-5 w-5 text-gray-400" />
      </div>

      {!expanded && (
        <Button 
          onClick={handleExport}
          disabled={isExporting || availableCategories.size === 0}
          className="w-full"
        >
          {isExporting ? 'Generating...' : 'Export Report'}
        </Button>
      )}

      {expanded && (
        <>
          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Export Options
              </CardTitle>
              <CardDescription>
                Customize your assessment report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Format Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Report Format</label>
                <div className="flex gap-4">
                  <Button
                    variant={exportRequest.format === 'pdf' ? 'default' : 'outline'}
                    onClick={() => handleFormatChange('pdf')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    PDF Report
                  </Button>
                  <Button
                    variant={exportRequest.format === 'csv' ? 'default' : 'outline'}
                    onClick={() => handleFormatChange('csv')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    CSV Data
                  </Button>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Assessment Categories</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id="all-categories"
                      checked={allCategoriesSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setExportRequest(prev => ({ ...prev, categories: [] }))
                        } else {
                          setExportRequest(prev => ({ 
                            ...prev, 
                            categories: ASSESSMENT_CATEGORIES.map(c => c.value) 
                          }))
                        }
                      }}
                    />
                    <label htmlFor="all-categories" className="text-sm font-medium">
                      All Categories
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ASSESSMENT_CATEGORIES.map(category => {
                      const isAvailable = availableCategories.has(category.value)
                      const isSelected = exportRequest.categories?.includes(category.value) || 
                                     (allCategoriesSelected && isAvailable)
                      
                      return (
                        <div key={category.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={category.value}
                            checked={isSelected}
                            onCheckedChange={(checked) => handleCategoryToggle(category.value, checked as boolean)}
                            disabled={!isAvailable}
                          />
                          <label 
                            htmlFor={category.value} 
                            className={`text-sm ${!isAvailable ? 'text-gray-400 line-through' : ''}`}
                          >
                            {category.label}
                          </label>
                          {isAvailable && (
                            <Badge variant="outline" className="text-xs">
                              {
                                latestAssessments.filter(a => a.type === category.value).length
                              } assessments
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Timeframe Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Timeframe</label>
                <Select 
                  value={exportRequest.timeframe} 
                  onValueChange={(value: string) => setExportRequest(prev => ({ ...prev, timeframe: value }))}
                >
                  <SelectTrigger className="w-full md:w-64">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEFRAME_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Options for PDF */}
              {exportRequest.format === 'pdf' && (
                <div>
                  <label className="text-sm font-medium mb-3 block">Additional Content</label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-charts"
                        checked={exportRequest.includeCharts}
                        onCheckedChange={(checked) => 
                          setExportRequest(prev => ({ ...prev, includeCharts: checked as boolean }))
                        }
                      />
                      <label htmlFor="include-charts" className="text-sm">
                        Include Charts and Graphs
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-gap-analysis"
                        checked={exportRequest.includeGapAnalysis}
                        onCheckedChange={(checked) => 
                          setExportRequest(prev => ({ ...prev, includeGapAnalysis: checked as boolean }))
                        }
                      />
                      <label htmlFor="include-gap-analysis" className="text-sm">
                        Include Gap Analysis
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-trends"
                        checked={exportRequest.includeTrends}
                        onCheckedChange={(checked) => 
                          setExportRequest(prev => ({ ...prev, includeTrends: checked as boolean }))
                        }
                      />
                      <label htmlFor="include-trends" className="text-sm">
                        Include Historical Trends
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Status */}
          {exportStatus.status !== 'idle' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {exportStatus.status === 'generating' && (
                    <>
                      <Clock className="h-5 w-5 text-blue-500 animate-spin" />
                      <span className="text-blue-600">{exportStatus.message}</span>
                    </>
                  )}
                  
                  {exportStatus.status === 'ready' && (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-600">{exportStatus.message}</span>
                      <Button onClick={handleDownload} className="ml-auto">
                        <Download className="h-4 w-4 mr-2" />
                        Download Report
                      </Button>
                    </>
                  )}
                  
                  {exportStatus.status === 'error' && (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-red-600">{exportStatus.message}</span>
                      <Button onClick={() => setExportStatus({ status: 'idle' })} variant="outline" className="ml-auto">
                        Try Again
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Button */}
          <Button 
            onClick={handleExport}
            disabled={isExporting || availableCategories.size === 0}
            className="w-full"
            size="lg"
          >
            {isExporting ? 'Generating Report...' : `Generate ${exportRequest.format.toUpperCase()} Report`}
          </Button>

          {/* Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">Report Information:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• PDF reports include formatted layouts and visualizations</li>
                      <li>CSV reports provide raw data for further analysis</li>
                      <li>Reports include only assessments you have access to</li>
                      <li>Generated reports are available for 24 hours</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}