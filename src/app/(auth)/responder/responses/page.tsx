'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// UI components
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// New error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader'
import { EmptyResponses, EmptySearchResults } from '@/components/shared/EmptyState'

// Icons
import { Package, Truck, Search, Filter, Clock, CheckCircle, ArrowLeft, Plus, AlertTriangle, User, X, Edit, Info, Shield } from 'lucide-react'

// API utilities
import { apiGet, extractArray } from '@/lib/api'

function ResponderResponsesPageContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
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
              matchesStatus = response.status === 'PLANNED'
            } else if (filterStatus === 'AWAITING_VERIFICATION') {
              matchesStatus = response.status === 'DELIVERED' && response.verificationStatus === 'SUBMITTED'
            } else if (filterStatus === 'VERIFIED') {
              matchesStatus = response.status === 'DELIVERED' && 
                (response.verificationStatus === 'VERIFIED' || response.verificationStatus === 'AUTO_VERIFIED')
            } else if (filterStatus === 'REJECTED') {
              matchesStatus = response.verificationStatus === 'REJECTED'
            }
            
            const matchesType = filterType === 'all' || response.type === filterType
            
            return matchesSearch && matchesStatus && matchesType
          })

        // Calculate status counts
        const plannedCount = responses.filter((r: any) => r.status === 'PLANNED').length
        const awaitingVerificationCount = responses.filter((r: any) => 
          r.status === 'DELIVERED' && r.verificationStatus === 'SUBMITTED'
        ).length
        const verifiedCount = responses.filter((r: any) => 
          r.status === 'DELIVERED' && (r.verificationStatus === 'VERIFIED' || r.verificationStatus === 'AUTO_VERIFIED')
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

            {/* Statistics */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{total}</div>
                  <p className="text-xs text-muted-foreground">
                    All assigned responses
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Planned</CardTitle>
                  <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{plannedCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Ready for delivery
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Awaiting Verification</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{awaitingVerificationCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Delivered, pending verification
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Verified</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Successfully completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <X className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Require attention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Responses</CardTitle>
                <CardDescription>
                  Search and filter your assigned responses by type and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search responses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="PLANNED">Planned</SelectItem>
                        <SelectItem value="AWAITING_VERIFICATION">Awaiting Verification</SelectItem>
                        <SelectItem value="VERIFIED">Verified</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="HEALTH">Health</SelectItem>
                        <SelectItem value="WASH">WASH</SelectItem>
                        <SelectItem value="SHELTER">Shelter</SelectItem>
                        <SelectItem value="FOOD">Food</SelectItem>
                        <SelectItem value="SECURITY">Security</SelectItem>
                        <SelectItem value="POPULATION">Population</SelectItem>
                        <SelectItem value="LOGISTICS">Logistics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Responses List */}
            <Card>
              <CardHeader>
                <CardTitle>Responses (Planned and Delivered)</CardTitle>
                <CardDescription>
                  {filteredResponses.length} of {total} responses match your filters
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredResponses.length === 0 ? (
                  <EmptySearchResults onClearFilters={() => {
                    setSearchTerm('')
                    setFilterStatus('all')
                    setFilterType('all')
                  }} />
                ) : (
                  <div className="space-y-4">
                    {filteredResponses.map((response: any) => (
                      <div key={response.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Truck className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{response.type} Response</h3>
                              <Badge variant={
                                response.status === 'DELIVERED' ? 'default' : 
                                response.status === 'PLANNED' ? 'secondary' : 
                                'outline'
                              }>
                                {response.status}
                              </Badge>
                              {response.verificationStatus && (
                                <Badge variant={
                                  response.verificationStatus === 'VERIFIED' ? 'default' :
                                  response.verificationStatus === 'AUTO_VERIFIED' ? 'default' :
                                  response.verificationStatus === 'REJECTED' ? 'destructive' :
                                  response.verificationStatus === 'SUBMITTED' ? 'secondary' :
                                  'outline'
                                } className={
                                  response.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-800 border-green-200' :
                                  response.verificationStatus === 'AUTO_VERIFIED' ? 'bg-green-100 text-green-800 border-green-200' :
                                  response.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                                  response.verificationStatus === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  ''
                                }>
                                  {response.verificationStatus.replace('_', ' ')}
                                </Badge>
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
                          {response.status === 'PLANNED' && (
                            <Button 
                              onClick={() => handleNavigateToDelivery(response.id)}
                              size="sm"
                            >
                              Confirm Delivery
                            </Button>
                          )}
                          {response.verificationStatus === 'REJECTED' && (
                            <>
                              <Button 
                                onClick={() => handleEditResponse(response.id)}
                                size="sm"
                                variant="outline"
                                className="text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button 
                                onClick={() => handleShowRejectionReason(response)}
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
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
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