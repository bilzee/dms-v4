'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// UI components
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// New error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader'
import { EmptyResponses } from '@/components/shared/EmptyState'

// Icons
import { Package, Truck, Clock, CheckCircle, ArrowLeft, Plus, AlertTriangle, User, X, Edit, Info, Shield } from 'lucide-react'

import { DataCardList, type ExpandedCardProps } from '@/components/shared/DataCardList'
import { type SeverityLevel } from '@/lib/utils/status-colors'

// API utilities
import { apiGet, extractArray } from '@/lib/api'

function ResponderResponsesPageContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const getResponseSeverity = (response: any): SeverityLevel => {
    if (response.verificationStatus === 'REJECTED') return 'critical'
    if (response.deliveryStatus === 'DELIVERED' && response.verificationStatus === 'SUBMITTED') return 'warning'
    if (response.deliveryStatus === 'PLANNED') return 'info'
    if (response.verificationStatus === 'VERIFIED' || response.verificationStatus === 'AUTO_VERIFIED') return 'success'
    return 'info'
  }

  const [showReasonDialog, setShowReasonDialog] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<any>(null)

  // Format incident display similar to assessment list
  const formatIncidentDisplay = (incident: any) => {
    if (!incident) return 'Unknown Incident'
    
    const type = incident.type || 'Unknown'
    const subType = incident.subType ? `-${incident.subType}` : ''
    const date = incident.createdAt ? new Date(incident.createdAt).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).replace(/\s+/g, '') : ''
    
    return `${type}${subType}${date ? `-${date}` : ''}`
  }

  const handleNavigateToDelivery = (responseId: string) => {
    router.push(`/responder/responses/${responseId}/deliver`)
  }

  const handleBackToPlanning = () => {
    router.push('/responder/planning')
  }

  const handleEditResponse = (responseId: string) => {
    // Navigate to edit page for rejected responses
    router.push(`/responder/responses/${responseId}/edit`)
  }

  const handleShowRejectionReason = (response: any) => {
    setSelectedResponse(response)
    setShowReasonDialog(true)
  }

  return (
    <SafeDataLoader
      queryFn={async () => {
        if (!user) throw new Error('User not authenticated')
        
        const result = await apiGet('/api/v1/responses/assigned?page=1&limit=100')
        if (result.error) {
          throw new Error(result.error)
        }
        const responses = extractArray(result.data)
        return {
          responses,
          total: (result as any)?.meta?.total || (result.data as any)?.pagination?.total || responses.length
        }
      }}
      enabled={!!user}
      fallbackData={{ responses: [], total: 0 }}
      loadingMessage="Loading your assigned responses..."
      errorTitle="Failed to load responses"
    >
      {(data, isLoading, error, retry) => {
        const responses = data?.responses || []
        const total = data?.total || 0

        // Filter responses
        const filteredResponses = responses
          .filter((response: any) => {
            const matchesSearch = searchTerm === '' || 
              response.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
              response.description?.toLowerCase().includes(searchTerm.toLowerCase())
            
            let matchesStatus = false
            if (filterStatus === 'all') {
              matchesStatus = true
            } else if (filterStatus === 'PLANNED') {
              matchesStatus = response.deliveryStatus === 'PLANNED'
            } else if (filterStatus === 'AWAITING_VERIFICATION') {
              matchesStatus = response.deliveryStatus === 'DELIVERED' && response.verificationStatus === 'SUBMITTED'
            } else if (filterStatus === 'VERIFIED') {
              matchesStatus = response.deliveryStatus === 'DELIVERED' && 
                (response.verificationStatus === 'VERIFIED' || response.verificationStatus === 'AUTO_VERIFIED')
            } else if (filterStatus === 'REJECTED') {
              matchesStatus = response.verificationStatus === 'REJECTED'
            }
            
            const matchesType = filterType === 'all' || response.type === filterType
            
            return matchesSearch && matchesStatus && matchesType
          })

        // Calculate status counts
        const plannedCount = responses.filter((r: any) => r.deliveryStatus === 'PLANNED').length
        const awaitingVerificationCount = responses.filter((r: any) => 
          r.deliveryStatus === 'DELIVERED' && r.verificationStatus === 'SUBMITTED'
        ).length
        const verifiedCount = responses.filter((r: any) => 
          r.deliveryStatus === 'DELIVERED' && (r.verificationStatus === 'VERIFIED' || r.verificationStatus === 'AUTO_VERIFIED')
        ).length
        const rejectedCount = responses.filter((r: any) => r.verificationStatus === 'REJECTED').length

        // Empty state handling
        if (!isLoading && responses.length === 0) {
          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={handleBackToPlanning}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Planning
                  </Button>
                  
                  <div className="flex items-center gap-3">
                    <Package className="h-6 w-6 text-blue-600" />
                    <h1 className="text-3xl font-bold">Response Deliveries</h1>
                    <Badge variant="outline">Responder</Badge>
                  </div>
                </div>
              </div>

              <EmptyResponses onRefresh={retry} />
            </div>
          )
        }

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleBackToPlanning}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Planning
                </Button>
                
                <div className="flex items-center gap-3">
                  <Package className="h-6 w-6 text-blue-600" />
                  <h1 className="text-3xl font-bold">Response Deliveries</h1>
                  <Badge variant="outline">Responder</Badge>
                </div>
              </div>
            </div>

            <StatCardGrid columns={5}>
              <StatCard label="Total Responses" value={total} severity="info" icon={Package} />
              <StatCard label="Planned" value={plannedCount} severity="info" icon={Clock} />
              <StatCard label="Awaiting Verification" value={awaitingVerificationCount} severity="warning" icon={AlertTriangle} />
              <StatCard label="Verified" value={verifiedCount} severity="success" icon={CheckCircle} />
              <StatCard label="Rejected" value={rejectedCount} severity="critical" icon={X} />
            </StatCardGrid>

            <DataCardList
              title="Responses (Planned and Delivered)"
              description={`${filteredResponses.length} of ${total} responses match your filters`}
              data={filteredResponses}
              loading={isLoading}
              emptyMessage={searchTerm || filterStatus !== 'all' || filterType !== 'all' ? 'No responses match your filters' : 'No responses assigned yet'}
              emptyType={searchTerm || filterStatus !== 'all' || filterType !== 'all' ? 'search' : 'data'}
              searchable
              searchPlaceholder="Search responses..."
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              filters={[
                {
                  key: 'status',
                  label: 'Status',
                  options: [
                    { label: 'All Statuses', value: 'all' },
                    { label: 'Planned', value: 'PLANNED' },
                    { label: 'Awaiting Verification', value: 'AWAITING_VERIFICATION' },
                    { label: 'Verified', value: 'VERIFIED' },
                    { label: 'Rejected', value: 'REJECTED' },
                  ],
                },
                {
                  key: 'type',
                  label: 'Type',
                  options: [
                    { label: 'All Types', value: 'all' },
                    { label: 'Health', value: 'HEALTH' },
                    { label: 'WASH', value: 'WASH' },
                    { label: 'Shelter', value: 'SHELTER' },
                    { label: 'Food', value: 'FOOD' },
                    { label: 'Security', value: 'SECURITY' },
                    { label: 'Population', value: 'POPULATION' },
                    { label: 'Logistics', value: 'LOGISTICS' },
                  ],
                },
              ]}
              filterValues={{ status: filterStatus, type: filterType }}
              onFilterChange={(key, value) => {
                if (key === 'status') setFilterStatus(value)
                if (key === 'type') setFilterType(value)
              }}
              getSeverity={(response: any) => getResponseSeverity(response)}
              renderCard={(response: any, { isExpanded, toggleExpand }: ExpandedCardProps) => (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Truck className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{response.type} Response</h3>
                        <Badge variant={
                          response.deliveryStatus === 'DELIVERED' ? 'default' : 
                          response.deliveryStatus === 'PLANNED' ? 'secondary' : 
                          'outline'
                        }>
                          {response.deliveryStatus}
                        </Badge>
                        {response.verificationStatus && (
                          <StatusBadge
                            status={response.verificationStatus}
                            domain="verification"
                            size="sm"
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Entity:</span> {response.entity?.name || 'Unknown Entity'}
                        {response.assessment?.incident && (
                          <span className="ml-3">
                            <span className="font-medium">Incident:</span> {formatIncidentDisplay(response.assessment.incident)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(response.createdAt).toLocaleDateString()} at{' '}
                        {new Date(response.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {response.deliveryStatus === 'PLANNED' && (
                      <Button 
                        onClick={(e) => { e.stopPropagation(); handleNavigateToDelivery(response.id); }}
                        size="sm"
                      >
                        Confirm Delivery
                      </Button>
                    )}
                    {response.verificationStatus === 'REJECTED' && (
                      <>
                        <Button 
                          onClick={(e) => { e.stopPropagation(); handleEditResponse(response.id); }}
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          onClick={(e) => { e.stopPropagation(); handleShowRejectionReason(response); }}
                          size="sm"
                          variant="outline"
                          className="text-orange-600 hover:text-orange-700 border-orange-600 hover:border-orange-700"
                        >
                          <Info className="h-4 w-4 mr-1" />
                          Reason
                        </Button>
                      </>
                    )}
                    <Link href={`/responder/responses/${response.id}`}>
                      <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            />
            
            {/* Rejection Reason Dialog */}
            <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Response Rejection Reason</DialogTitle>
                  <DialogDescription>
                    This response was rejected by the Coordinator for the following reason:
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <X className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-900 mb-1">Rejection Reason</h4>
                        <p className="text-sm text-red-700">
                          {selectedResponse?.rejectionReason || 'No reason provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowReasonDialog(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )
      }}
    </SafeDataLoader>
  )
}

export default function ResponderResponsesPage() {
  const { availableRoles } = useAuth()

  // Custom error message for multi-role users who haven't selected RESPONDER role
  const RoleAccessError = () => {
    const hasResponderRole = availableRoles.includes('RESPONDER');
    
    if (!hasResponderRole) {
      return (
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="p-6">
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  You do not have permission to access this page. Responder role is required to view responses.
                </AlertDescription>
              </Alert>
              <div className="text-center text-muted-foreground">
                This page is only available to users with the Responder role for managing assigned responses.
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <User className="h-4 w-4" />
              You need to select the <strong>Responder</strong> role to access this page.
            </AlertDescription>
          </Alert>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Role Selection Required
              </h3>
              <p className="text-blue-700 mb-4">
                You have the Responder role assigned, but you need to actively select it to view your assigned responses.
              </p>
              <p className="text-sm text-blue-600 mb-6">
                Switch to the Responder role using the role selector in the top-right corner of the page.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Refresh Page After Selecting Role
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <RoleBasedRoute 
      requiredRole="RESPONDER" 
      fallbackPath="/dashboard"
      errorComponent={<RoleAccessError />}
    >
      <ResponderResponsesPageContent />
    </RoleBasedRoute>
  )
}