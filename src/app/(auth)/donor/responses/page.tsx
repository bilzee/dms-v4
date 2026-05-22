'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'

// New error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader'
import { EmptyState, EmptyResponses, EmptySearchResults } from '@/components/shared/EmptyState'

// Icons
import { Package, Truck, Search, Filter, AlertTriangle, Clock, CheckCircle, ArrowLeft, Eye } from 'lucide-react'

// Services and hooks
import { useAuth } from '@/hooks/useAuth'

// API utilities
import { apiGet, extractArray } from '@/lib/api'

function DonorResponsesPageContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // Get all responses related to donor commitments (read-only)
  const fetchDonorResponses = async () => {
    if (!user) throw new Error('User not authenticated')
    
    // First get the donor profile to find the donor ID
    const profileResult = await apiGet('/api/v1/donors/profile')
    if (!profileResult.success) {
      throw new Error(profileResult.error || 'Failed to fetch donor profile')
    }
    
    const donor = profileResult.data?.donor
    
    if (!donor) {
      throw new Error('Donor profile not found')
    }
    
    // Now use the donor ID to get commitments with responses
    const commitmentsResult = await apiGet(`/api/v1/donors/${donor.id}/commitments?includeResponses=true`)
    if (!commitmentsResult.success) {
      throw new Error(commitmentsResult.error || 'Failed to fetch commitment responses')
    }
    
    const commitmentsRaw = commitmentsResult.data?.data || commitmentsResult.data
    const commitments = extractArray(commitmentsRaw)
    
    // Extract responses from commitments
    const responses = commitments.reduce((acc: any[], commitment: any) => {
      if (commitment.responses && commitment.responses.length > 0) {
        return acc.concat(commitment.responses.map((resp: any) => ({
          ...resp,
          commitmentId: commitment.id,
          donorCommitment: commitment
        })))
      }
      return acc
    }, [])
    
    return {
      responses: responses,
      total: responses.length
    }
  }

  
  const handleBackToDashboard = () => {
    router.push('/donor/dashboard')
  }

  return (
    <div className="container mx-auto py-6">
      <SafeDataLoader
        queryFn={fetchDonorResponses}
        enabled={!!user}
        fallbackData={{ responses: [], total: 0 }}
        loadingMessage="Loading commitment responses..."
        errorTitle="Failed to load commitment responses"
      >
        {(data, isLoading, error, retry) => {
          const responses = data?.responses || []
          const total = data?.total || 0

          // Filter responses
          const filteredResponses = responses
            .filter((response: any) => {
              const matchesSearch = searchTerm === '' || 
                response.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                response.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                response.entity?.name?.toLowerCase().includes(searchTerm.toLowerCase())
              
              let matchesStatus = false
              if (filterStatus === 'all') {
                matchesStatus = true
              } else if (filterStatus === 'PLANNED') {
                matchesStatus = response.status === 'PLANNED'
              } else if (filterStatus === 'DELIVERED') {
                matchesStatus = response.status === 'DELIVERED'
              } else if (filterStatus === 'VERIFIED') {
                matchesStatus = response.status === 'DELIVERED' && 
                  (response.verificationStatus === 'VERIFIED' || response.verificationStatus === 'AUTO_VERIFIED')
              }
              
              const matchesType = filterType === 'all' || response.type === filterType
              
              return matchesSearch && matchesStatus && matchesType
            })

          // Calculate status counts
          const plannedCount = responses.filter((r: any) => r.status === 'PLANNED').length
          const deliveredCount = responses.filter((r: any) => r.status === 'DELIVERED').length
          const verifiedCount = responses.filter((r: any) => 
            r.status === 'DELIVERED' && (r.verificationStatus === 'VERIFIED' || r.verificationStatus === 'AUTO_VERIFIED')
          ).length

          // Empty state handling
          if (!isLoading && responses.length === 0) {
            return (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={handleBackToDashboard}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Dashboard
                    </Button>
                    <Badge variant="outline">
                      COMMITMENT RESPONSES
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Read-only view
                    </span>
                  </div>
                  
                  <div>
                    <h1 className="text-2xl font-bold">All Commitment Status</h1>
                    <p className="text-muted-foreground">Track responses from your commitments</p>
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
                    onClick={handleBackToDashboard}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                  </Button>
                  <Badge variant="outline">
                    COMMITMENT RESPONSES
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Read-only view
                  </span>
                </div>
                
                <div>
                  <h1 className="text-2xl font-bold">All Commitment Status</h1>
                  <p className="text-muted-foreground">Track responses from your commitments</p>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-blue-700">{plannedCount}</div>
                        <div className="text-sm text-blue-600">Planned Responses</div>
                      </div>
                      <Package className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-orange-700">{deliveredCount}</div>
                        <div className="text-sm text-orange-600">Delivered</div>
                      </div>
                      <Truck className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-green-700">{verifiedCount}</div>
                        <div className="text-sm text-green-600">Verified</div>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Response List */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Commitment Response Status
                        <Badge variant="secondary">{filteredResponses.length}</Badge>
                      </CardTitle>
                      <CardDescription>
                        View the status of responses from your commitments (read-only)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search responses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full lg:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PLANNED">Planned</SelectItem>
                        <SelectItem value="DELIVERED">Delivered</SelectItem>
                        <SelectItem value="VERIFIED">Verified</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full lg:w-48">
                        <SelectValue placeholder="Filter by type" />
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

                  {filteredResponses.length === 0 ? (
                    <EmptySearchResults onClearFilters={() => {
                      setSearchTerm('')
                      setFilterStatus('all')
                      setFilterType('all')
                    }} />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredResponses.map((response: any) => (
                        <Card key={response.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge 
                                    variant={response.status === 'DELIVERED' ? 'default' : 'secondary'}
                                    className="shrink-0"
                                  >
                                    {response.status}
                                  </Badge>
                                  {response.verificationStatus && (
                                    <Badge 
                                      variant={response.verificationStatus === 'VERIFIED' || response.verificationStatus === 'AUTO_VERIFIED' ? 'default' : 'outline'}
                                      className="shrink-0"
                                    >
                                      {response.verificationStatus}
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant={
                                      response.priority === 'CRITICAL' ? 'destructive' :
                                      response.priority === 'HIGH' ? 'default' :
                                      'secondary'
                                    }
                                    className="shrink-0"
                                  >
                                    {response.priority}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-1">
                                  <h3 className="font-semibold text-lg">
                                    {response.type}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {response.entity?.name}
                                  </p>
                                  {response.donorCommitment && (
                                    <p className="text-xs text-blue-600">
                                      From Commitment #{response.donorCommitment.id?.slice(-6)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-medium text-sm mb-2">Items</h4>
                                <div className="space-y-1">
                                  {(() => {
                                    const items = Array.isArray(response.items) ? response.items : []
                                    return (
                                      <>
                                        {items.slice(0, 2).map((item: any, index: number) => (
                                          <div key={index} className="text-sm flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                              <span className="font-medium">{item.quantity} {item.unit}</span>
                                              <span className="text-muted-foreground">•</span>
                                              <span>{item.name}</span>
                                            </span>
                                          </div>
                                        ))}
                                        {items.length > 2 && (
                                          <div className="text-sm text-muted-foreground">
                                            +{items.length - 2} more items...
                                          </div>
                                        )}
                                      </>
                                    )
                                  })()}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between pt-3 border-t">
                                <div className="text-xs text-muted-foreground">
                                  <div>Planned: {new Date(response.plannedDate || response.createdAt).toLocaleDateString('en-GB')}</div>
                                  {response.responseDate && (
                                    <div>Delivered: {new Date(response.responseDate).toLocaleDateString('en-GB')}</div>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs bg-blue-50">
                                  Your Donation
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        }}
      </SafeDataLoader>
    </div>
  )
}

export default function DonorResponsesPage() {
  return (
    <RoleBasedRoute requiredRole="DONOR" fallbackPath="/dashboard">
      <DonorResponsesPageContent />
    </RoleBasedRoute>
  )
}