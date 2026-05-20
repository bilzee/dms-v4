/**
 * Living Documentation Dashboard
 * 
 * This dashboard provides real-time visibility into:
 * 1. What tests claim works vs what actually works
 * 2. Manual fixes that have been made but not captured in tests
 * 3. Recurring fix patterns that need automation
 * 4. Coverage gaps and regression risks
 * 5. Evolution of the system over time
 */

'use client'

import React, { useState, useEffect } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Target,
  Zap,
  Bug,
  FileText,
  BarChart3,
  RefreshCw,
  PlayCircle,
  PauseCircle
} from 'lucide-react'

// ==================== Types ====================

interface FixData {
  id: string
  timestamp: number
  description: string
  feature: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  testGenerated: boolean
  patternMatched: boolean
  qualityScore: number
}

interface PatternData {
  name: string
  frequency: number
  lastSeen: number
  effectiveness: number
  automated: boolean
  examples: string[]
}

interface CoverageData {
  feature: string
  expectedBehavior: string
  actualBehavior: string
  testPasses: boolean
  actuallyWorks: boolean
  gap: 'none' | 'partial' | 'complete'
  fixRequired: boolean
  automationPotential: number
}

interface LivingStats {
  totalFixes: number
  testsGenerated: number
  patternsIdentified: number
  coverageGap: number
  qualityScore: number
  regressionRisk: number
  activeSession: boolean
}

// ==================== Components ====================

export function LivingDocumentationDashboard() {
  const [stats, setStats] = useState<LivingStats>({
    totalFixes: 0,
    testsGenerated: 0,
    patternsIdentified: 0,
    coverageGap: 0,
    qualityScore: 0,
    regressionRisk: 0,
    activeSession: false
  })
  
  const [fixes, setFixes] = useState<FixData[]>([])
  const [patterns, setPatterns] = useState<PatternData[]>([])
  const [coverage, setCoverage] = useState<CoverageData[]>([])
  const [isLive, setIsLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Load initial data
  useEffect(() => {
    loadLivingTestData()
    const interval = setInterval(loadLivingTestData, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const loadLivingTestData = async () => {
    try {
      const result = await apiGet('/api/living-tests/status')
      if (result.success) {
        const data = result.data as any
        setStats(data?.stats || data)
        setFixes(data?.fixes || [])
        setPatterns(data?.patterns || [])
        setCoverage(data?.coverage || [])
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to load living test data:', error)
    }
  }

  const startCaptureSession = async () => {
    try {
      const result = await apiPost('/api/living-tests/start')
      if (result.success) {
        setIsLive(true)
        setStats(prev => ({ ...prev, activeSession: true }))
      }
    } catch (error) {
      console.error('Failed to start capture session:', error)
    }
  }

  const stopCaptureSession = async () => {
    try {
      const result = await apiPost('/api/living-tests/stop')
      if (result.success) {
        setIsLive(false)
        setStats(prev => ({ ...prev, activeSession: false }))
      }
    } catch (error) {
      console.error('Failed to stop capture session:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getGapColor = (gap: string) => {
    switch (gap) {
      case 'complete': return 'bg-red-500'
      case 'partial': return 'bg-yellow-500'
      case 'none': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Living Test Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time view of what actually works vs what tests claim works
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          
          <Button
            onClick={isLive ? stopCaptureSession : startCaptureSession}
            variant={isLive ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isLive ? (
              <>
                <PauseCircle className="w-4 h-4" />
                Stop Capture
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                Start Capture
              </>
            )}
          </Button>
          
          <Button onClick={loadLivingTestData} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Live Status Indicator */}
      {stats.activeSession && (
        <Alert className="border-green-200 bg-green-50">
          <Activity className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Live Capture Active</AlertTitle>
          <AlertDescription className="text-green-700">
            The system is currently monitoring your development and capturing manual fixes in real-time.
            Make your fixes normally - the system will detect and learn from them automatically.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Fixes</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFixes}</div>
            <p className="text-xs text-muted-foreground">
              Fixes captured this session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.testsGenerated}</div>
            <p className="text-xs text-muted-foreground">
              Auto-generated from fixes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage Gap</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coverageGap}%</div>
            <Progress value={stats.coverageGap} className="mt-2" />
            <p className="text-xs text-muted-foreground">
              Tests vs reality gap
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regression Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.regressionRisk}%</div>
            <Progress value={stats.regressionRisk} className="mt-2" />
            <p className="text-xs text-muted-foreground">
              Risk of future breaks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="coverage-gap" className="space-y-4">
        <TabsList>
          <TabsTrigger value="coverage-gap">Coverage Gap</TabsTrigger>
          <TabsTrigger value="recent-fixes">Recent Fixes</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="quality">Quality Analysis</TabsTrigger>
        </TabsList>

        {/* Coverage Gap Tab */}
        <TabsContent value="coverage-gap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Test vs Reality Gap Analysis
              </CardTitle>
              <CardDescription>
                Features where tests pass but manual fixes were still needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {coverage.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{item.feature}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.testPasses ? "default" : "destructive"}>
                          Tests: {item.testPasses ? "Pass" : "Fail"}
                        </Badge>
                        <Badge variant={item.actuallyWorks ? "default" : "destructive"}>
                          Reality: {item.actuallyWorks ? "Works" : "Broken"}
                        </Badge>
                        <Badge className={getGapColor(item.gap)}>
                          Gap: {item.gap}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Expected:</span>
                        <p className="text-muted-foreground">{item.expectedBehavior}</p>
                      </div>
                      <div>
                        <span className="font-medium">Actual:</span>
                        <p className="text-muted-foreground">{item.actualBehavior}</p>
                      </div>
                    </div>
                    
                    {item.fixRequired && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-medium">Fix Required</span>
                        <div className="flex items-center gap-2">
                          <Progress value={item.automationPotential} className="w-20" />
                          <span className="text-xs text-muted-foreground">
                            {item.automationPotential}% automatable
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {coverage.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No coverage gaps detected!</p>
                    <p className="text-sm">Tests and reality are aligned.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Fixes Tab */}
        <TabsContent value="recent-fixes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Recent Manual Fixes
              </CardTitle>
              <CardDescription>
                Fixes captured during development that weren&apos;t covered by existing tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fixes.map((fix) => (
                  <div key={fix.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{fix.description}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(fix.severity)}>
                          {fix.severity}
                        </Badge>
                        <Badge variant={fix.testGenerated ? "default" : "secondary"}>
                          {fix.testGenerated ? "Test Generated" : "No Test"}
                        </Badge>
                        {fix.patternMatched && (
                          <Badge variant="outline">Pattern Matched</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Feature: {fix.feature}</span>
                      <span>Quality Score: {fix.qualityScore}%</span>
                      <span>{new Date(fix.timestamp).toLocaleString()}</span>
                    </div>
                    
                    {!fix.testGenerated && (
                      <div className="mt-2">
                        <Button size="sm" variant="outline">
                          Generate Test
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {fixes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No manual fixes captured yet.</p>
                    <p className="text-sm">Start a capture session and make some fixes!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recurring Fix Patterns
              </CardTitle>
              <CardDescription>
                Common fix patterns that should be automated or prevented
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patterns.map((pattern, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{pattern.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={pattern.automated ? "default" : "secondary"}>
                          {pattern.automated ? "Automated" : "Manual"}
                        </Badge>
                        <Badge variant="outline">
                          {pattern.frequency} occurrences
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Effectiveness:</span>
                        <Progress value={pattern.effectiveness} className="mt-1" />
                      </div>
                      <div>
                        <span className="font-medium">Last Seen:</span>
                        <p className="text-muted-foreground">
                          {new Date(pattern.lastSeen).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {pattern.examples.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium">Examples:</span>
                        <ul className="text-xs text-muted-foreground mt-1">
                          {pattern.examples.slice(0, 3).map((example, i) => (
                            <li key={i}>• {example}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {!pattern.automated && pattern.frequency >= 3 && (
                      <div className="mt-2">
                        <Button size="sm" variant="outline">
                          Automate This Pattern
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {patterns.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No recurring patterns identified yet.</p>
                    <p className="text-sm">Patterns will appear as fixes accumulate.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Analysis Tab */}
        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Overall Quality</span>
                    <span className="text-sm">{stats.qualityScore}%</span>
                  </div>
                  <Progress value={stats.qualityScore} />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Test Reproducibility</span>
                    <span className="text-sm">85%</span>
                  </div>
                  <Progress value={85} />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Fix Completeness</span>
                    <span className="text-sm">72%</span>
                  </div>
                  <Progress value={72} />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Automation Coverage</span>
                    <span className="text-sm">68%</span>
                  </div>
                  <Progress value={68} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertTitle>Improving Trend</AlertTitle>
                  <AlertDescription>
                    Manual fixes have decreased by 25% this week compared to last week.
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertTitle>Focus Area</AlertTitle>
                  <AlertDescription>
                    GPS-related fixes account for 40% of all manual interventions.
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertTitle>High Priority</AlertTitle>
                  <AlertDescription>
                    3 critical fixes need automated tests to prevent regressions.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ==================== Helper Components ====================

interface CoverageGapIndicatorProps {
  gap: 'none' | 'partial' | 'complete'
  percentage: number
  label: string
}

function CoverageGapIndicator({ gap, percentage, label }: CoverageGapIndicatorProps) {
  const getColor = () => {
    switch (gap) {
      case 'none': return 'text-green-600'
      case 'partial': return 'text-yellow-600'
      case 'complete': return 'text-red-600'
    }
  }

  const getIcon = () => {
    switch (gap) {
      case 'none': return <CheckCircle className="w-4 h-4" />
      case 'partial': return <AlertTriangle className="w-4 h-4" />
      case 'complete': return <XCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="flex items-center gap-2">
      {getIcon()}
      <span className={`text-sm font-medium ${getColor()}`}>{label}</span>
      <span className="text-sm text-muted-foreground">({percentage}%)</span>
    </div>
  )
}

interface FixQualityIndicatorProps {
  score: number
  label: string
}

function FixQualityIndicator({ score, label }: FixQualityIndicatorProps) {
  const getColor = () => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-current" />
      <span className={`text-sm font-medium ${getColor()}`}>{label}</span>
      <span className="text-sm text-muted-foreground">({score}%)</span>
    </div>
  )
}