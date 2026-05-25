'use client'

import { useEffect, useState } from 'react'
import { PreliminaryAssessmentForm } from '@/components/forms/assessment/PreliminaryAssessmentForm'
import { usePreliminaryAssessment } from '@/hooks/usePreliminaryAssessment'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, FileText, Clock, Wifi, WifiOff, RefreshCw, Plus, Edit, ArrowLeft } from '@/lib/icons'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewPreliminaryAssessmentPage() {
  const router = useRouter()
  const { user, hasRole } = useAuth()
  const { 
    loadAssessments, 
    loadOfflineAssessments,
    syncOfflineAssessments,
    recentAssessments, 
    drafts, 
    isLoading,
    error 
  } = usePreliminaryAssessment()
  
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    if (hasRole('ASSESSOR')) {
      loadAssessments()
      loadOfflineAssessments()
    }
  }, [hasRole, loadAssessments, loadOfflineAssessments])

  const handleSyncOffline = async () => {
    try {
      await syncOfflineAssessments()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const offlineCount = recentAssessments.filter((a: any) => a._offline).length
  const pendingCount = recentAssessments.filter((a: any) => a._syncStatus === 'pending').length

  if (!hasRole('ASSESSOR')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. Assessor role is required.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/assessor/preliminary-assessment">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Preliminary Assessment</h1>
            <p className="text-gray-600">
              Create initial disaster impact assessments for incident response
            </p>
          </div>
        </div>
        <OfflineIndicator />
      </div>

      {/* Draft Selection */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Continue Draft
            </CardTitle>
            <CardDescription>
              You have {drafts.length} saved draft{drafts.length > 1 ? 's' : ''}. Select one to continue editing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Button
                onClick={() => {
                  setSelectedDraftId(null)
                  setFormKey(prev => prev + 1)
                }}
                variant="outline"
                className="justify-start"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start New Assessment
              </Button>
              
              <div className="grid gap-2">
                <label className="text-sm font-medium">Or select a draft to continue:</label>
                <Select onValueChange={(value) => {
                  setSelectedDraftId(value)
                  setFormKey(prev => prev + 1)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a draft to continue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {drafts.map((draft) => (
                      <SelectItem key={draft.id} value={draft.id}>
                        <div className="flex flex-col">
                          <span className="text-sm">{draft.data?.reportingLGA || 'Draft'} - {draft.data?.reportingWard || 'Unknown Ward'}</span>
                          <span className="text-xs text-gray-500">
                            {draft.autoSaved ? 'Auto-saved' : 'Manual save'} - {new Date(draft.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {(error as unknown) instanceof Error ? (error as unknown as Error).message : String(error)}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Form */}
      <PreliminaryAssessmentForm
        key={formKey}
        disabled={isLoading}
        showIncidentCreation={false}
        selectedDraftId={selectedDraftId}
      />
    </div>
  )
}