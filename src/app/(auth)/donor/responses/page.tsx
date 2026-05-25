'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// UI components
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { DataCardList, type ExpandedCardProps } from '@/components/shared/DataCardList'
import { type SeverityLevel } from '@/lib/utils/status-colors'

// New error handling components
import { SafeDataLoader } from '@/components/shared/SafeDataLoader'
import { EmptyResponses } from '@/components/shared/EmptyState'

// Icons
import { Package, Truck, CheckCircle, ArrowLeft } from '@/lib/icons'

// Services and hooks
import { useAuth } from '@/hooks/useAuth'

// API utilities
import { apiGet, extractArray } from '@/lib/api'

const getResponseSeverity = (response: any): SeverityLevel => {
  if (response.verificationStatus === 'VERIFIED' || response.verificationStatus === 'AUTO_VERIFIED') return 'success'
  if (response.deliveryStatus === 'DELIVERED') return 'info'
  if (response.deliveryStatus === 'PLANNED') return 'warning'
  return 'neutral'
}

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
                matchesStatus = response.deliveryStatus === 'PLANNED'
              } else if (filterStatus === 'DELIVERED') {
                matchesStatus = response.deliveryStatus === 'DELIVERED'
              } else if (filterStatus === 'VERIFIED') {
                matchesStatus = response.deliveryStatus === 'DELIVERED' && 
                  (response.verificationStatus === 'VERIFIED' || response.verificationStatus === 'AUTO_VERIFIED')
              }
              
              const matchesType = filterType === 'all' || response.type === filterType
              
              return matchesSearch && matchesStatus && matchesType
            })

          // Calculate status counts
          const plannedCount = responses.filter((r: any) => r.deliveryStatus === 'PLANNED').length
          const deliveredCount = responses.filter((r: any) => r.deliveryStatus === 'DELIVERED').length
          const verifiedCount = responses.filter((r: any) => 
            r.deliveryStatus === 'DELIVERED' && (r.verificationStatus === 'VERIFIED' || r.verificationStatus === 'AUTO_VERIFIED')
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

              <StatCardGrid columns={3}>
                <StatCard
                  label="Planned Responses"
                  value={plannedCount}
                  severity="info"
                  icon={Package}
                />
                <StatCard
                  label="Delivered"
                  value={deliveredCount}
                  severity="success"
                  icon={Truck}
                />
                <StatCard
                  label="Verified"
                  value={verifiedCount}
                  severity="success"
                  icon={CheckCircle}
                />
              </StatCardGrid>

              <DataCardList
                title="Commitment Response Status"
                description="View the status of responses from your commitments (read-only)"
                data={filteredResponses}
                loading={false}
                emptyMessage="No responses found"
                emptyType="search"
                getSeverity={getResponseSeverity}
                searchable
                searchPlaceholder="Search responses..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                filters={[
                  {
                    key: 'status',
                    label: 'Filter by status',
                    options: [
                      { label: 'All Status', value: 'all' },
                      { label: 'Planned', value: 'PLANNED' },
                      { label: 'Delivered', value: 'DELIVERED' },
                      { label: 'Verified', value: 'VERIFIED' },
                    ],
                  },
                  {
                    key: 'type',
                    label: 'Filter by type',
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
                renderCard={(response: any, expandProps: ExpandedCardProps) => (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={response.deliveryStatus === 'DELIVERED' ? 'default' : 'secondary'}
                            className="shrink-0"
                          >
                            {response.deliveryStatus}
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
                    <div className="mt-3 space-y-3">
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
                  </>
                )}
              />
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