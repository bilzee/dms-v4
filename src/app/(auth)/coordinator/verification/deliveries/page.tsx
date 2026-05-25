'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useVerificationDeliveries } from '@/hooks/useVerificationDeliveries'
import { apiPost } from '@/lib/api'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Eye,
  MapPin,
  Calendar,
  Loader2,
  Clock
} from '@/lib/icons'
import { DataTable, type ColumnDef, type RowAction } from '@/components/shared/DataTable'

interface DeliveryQueueItem {
  id: string
  type: string
  priority: string
  status: string
  verificationStatus: string
  responseDate: string | null
  plannedDate: string
  deliveryInfo: {
    confirmedAt: string
    deliveredBy: string
    deliveryLocation: {
      latitude: number
      longitude: number
      accuracy?: number
    }
    deliveryNotes?: string
    deliveredItems: Array<{
      name: string
      unit: string
      quantity: number
    }>
    mediaAttachmentIds: string[]
  }
  entity: {
    id: string
    name: string
    type: string
    location?: string
  }
  responder: {
    id: string
    name: string
    email: string
  }
  assessment: {
    id: string
    rapidAssessmentType: string
    rapidAssessmentDate: string
  }
  deliveryProof: Array<{
    id: string
    filename: string
    filePath: string
    thumbnailPath?: string
    uploadedAt: string
    metadata: any
  }>
  createdAt: string
  updatedAt: string
}

const getPriorityBadge = (priority: string) => {
  const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
    'CRITICAL': 'destructive',
    'HIGH': 'destructive',
    'MEDIUM': 'default',
    'LOW': 'secondary'
  }
  return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

export default function DeliveryVerificationQueuePage() {
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryQueueItem | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [verificationAction, setVerificationAction] = useState<'approve' | 'reject' | 'request_info'>('approve')
  const [rejectionReason, setRejectionReason] = useState('')
  const [feedback, setFeedback] = useState('')
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: 'ALL',
    entityId: '',
    responderId: '',
    dateFrom: '',
    dateTo: ''
  })

  const queryClient = useQueryClient()

  // Fetch delivery verification queue
  const {
    data: queueData,
    isLoading: isLoadingQueue,
    error: queueError,
    isFetching: isFetchingQueue
  } = useVerificationDeliveries({
    page: filters.page,
    limit: filters.limit,
    status: filters.status !== 'ALL' ? filters.status : undefined,
  })

  // Verification mutation
  const verifyDeliveryMutation = useMutation({
    mutationFn: async ({
      deliveryId,
      action,
      rejectionReason,
      feedback
    }: {
      deliveryId: string
      action: 'approve' | 'reject' | 'request_info'
      rejectionReason?: string
      feedback?: string
    }) => {
      const result = await apiPost(`/api/v1/verification/queue/deliveries/${deliveryId}/verify`, { action, rejectionReason, feedback })
      if (!result.success) throw new Error(result.error || 'Failed to verify delivery')
      return result.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-deliveries'] })
      setSelectedDelivery(null)
      setRejectionReason('')
      setFeedback('')
    }
  })

  const handleVerifyDelivery = (action: 'approve' | 'reject' | 'request_info') => {
    if (!selectedDelivery) return

    setVerificationAction(action)
    
    if (action === 'approve') {
      verifyDeliveryMutation.mutate({
        deliveryId: selectedDelivery.id,
        action
      })
    }
  }

  const handleConfirmVerification = () => {
    if (!selectedDelivery) return

    verifyDeliveryMutation.mutate({
      deliveryId: selectedDelivery.id,
      action: verificationAction,
      rejectionReason: rejectionReason || undefined,
      feedback: feedback || undefined
    })
  }

  const handleReviewDelivery = (deliveryId: string) => {
    const delivery = queueData?.data?.find((d: DeliveryQueueItem) => d.id === deliveryId)
    if (delivery) {
      setSelectedDelivery(delivery)
      setReviewDialogOpen(true)
    }
  }

  const deliveryColumns: ColumnDef<DeliveryQueueItem>[] = [
    {
      key: 'entity',
      header: 'Entity',
      render: (delivery) => (
        <div>
          <div className="font-medium">{delivery.entity.name}</div>
          <div className="text-sm text-muted-foreground">{delivery.entity.type}</div>
        </div>
      ),
    },
    {
      key: 'responder',
      header: 'Responder',
      render: (delivery) => (
        <div>
          <div className="font-medium">{delivery.responder.name}</div>
          <div className="text-sm text-muted-foreground">{delivery.responder.email}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (delivery) => <Badge variant="outline">{delivery.type}</Badge>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (delivery) => getPriorityBadge(delivery.priority),
    },
    {
      key: 'responseDate',
      header: 'Delivery Date',
      render: (delivery) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {delivery.responseDate
            ? formatDateTime(delivery.responseDate)
            : 'Not delivered'}
        </div>
      ),
    },
    {
      key: 'verificationStatus',
      header: 'Status',
      render: (delivery) => (
        <Badge
          variant={
            delivery.verificationStatus === 'VERIFIED' ? 'default' :
            delivery.verificationStatus === 'REJECTED' ? 'destructive' :
            'secondary'
          }
        >
          {delivery.verificationStatus}
        </Badge>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (delivery) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-mono">
            {delivery.deliveryInfo.deliveryLocation.latitude.toFixed(4)},
            {delivery.deliveryInfo.deliveryLocation.longitude.toFixed(4)}
          </span>
        </div>
      ),
    },
  ]

  const deliveryActions: RowAction[] = [
    {
      label: 'Review',
      icon: Eye,
      onClick: handleReviewDelivery,
    },
  ]

  if (queueError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load delivery verification queue. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Package className="h-8 w-8 text-blue-600" />
          Delivery Verification Queue
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and verify deliveries submitted by responders
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Entity ID"
              value={filters.entityId}
              onChange={(e) => setFilters({ ...filters, entityId: e.target.value })}
            />

            <Input
              placeholder="Responder ID"
              value={filters.responderId}
              onChange={(e) => setFilters({ ...filters, responderId: e.target.value })}
            />

            <Input
              type="date"
              placeholder="From Date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />

            <Input
              type="date"
              placeholder="To Date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />

            <Button
              variant="outline"
              onClick={() => setFilters({
                page: 1,
                limit: 20,
                status: 'ALL',
                entityId: '',
                responderId: '',
                dateFrom: '',
                dateTo: ''
              })}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {queueData?.data && (
        <StatCardGrid columns={4}>
          <StatCard
            label="Total Deliveries"
            value={queueData.meta.pagination.total}
            severity="info"
            icon={Package}
          />
          <StatCard
            label="Pending Verification"
            value={queueData.data.filter((d: DeliveryQueueItem) => d.verificationStatus === 'SUBMITTED').length}
            severity="warning"
            icon={Clock}
          />
          <StatCard
            label="Verified"
            value={queueData.data.filter((d: DeliveryQueueItem) => d.verificationStatus === 'VERIFIED').length}
            severity="success"
            icon={CheckCircle}
          />
          <StatCard
            label="Rejected"
            value={queueData.data.filter((d: DeliveryQueueItem) => d.verificationStatus === 'REJECTED').length}
            severity="critical"
            icon={XCircle}
          />
        </StatCardGrid>
      )}

      <DataTable
        title="Delivery Queue"
        description={`Showing ${queueData?.data?.length || 0} of ${queueData?.meta?.pagination?.total || 0} deliveries`}
        columns={deliveryColumns}
        data={queueData?.data ?? []}
        loading={isLoadingQueue}
        emptyMessage="No deliveries found in the verification queue"
        actions={deliveryActions}
        pagination={queueData?.meta?.pagination ? {
          pageSize: queueData.meta.pagination.limit,
          total: queueData.meta.pagination.total,
          currentPage: queueData.meta.pagination.page,
          onPageChange: (page: number) => setFilters({ ...filters, page }),
        } : undefined}
      />

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Delivery</DialogTitle>
            <DialogDescription>
              Review delivery details and verification status
            </DialogDescription>
          </DialogHeader>

          {selectedDelivery && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Entity</Label>
                  <p className="font-medium">{selectedDelivery.entity.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Responder</Label>
                  <p className="font-medium">{selectedDelivery.responder.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Response Type</Label>
                  <p className="font-medium">{selectedDelivery.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                  {getPriorityBadge(selectedDelivery.priority)}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Delivery Location</Label>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="font-mono text-sm">
                    {selectedDelivery.deliveryInfo.deliveryLocation.latitude.toFixed(6)},
                    {selectedDelivery.deliveryInfo.deliveryLocation.longitude.toFixed(6)}
                  </p>
                  {selectedDelivery.deliveryInfo.deliveryLocation.accuracy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Accuracy: ±{selectedDelivery.deliveryInfo.deliveryLocation.accuracy}m
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Delivered Items</Label>
                <div className="space-y-1 mt-2">
                  {selectedDelivery.deliveryInfo.deliveredItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                      <span>{item.name}</span>
                      <span className="font-medium">{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDelivery.deliveryInfo.deliveryNotes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Delivery Notes</Label>
                  <p className="text-sm mt-1">{selectedDelivery.deliveryInfo.deliveryNotes}</p>
                </div>
              )}

              {selectedDelivery.deliveryProof.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Delivery Photos</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {selectedDelivery.deliveryProof.map((photo) => (
                      <div key={photo.id} className="border rounded p-2">
                        <div className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-center mt-1 truncate">{photo.filename}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDelivery.verificationStatus === 'SUBMITTED' && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-muted-foreground">Verification Action</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={() => handleVerifyDelivery('approve')}
                      disabled={verifyDeliveryMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleVerifyDelivery('reject')}
                      disabled={verifyDeliveryMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleVerifyDelivery('request_info')}
                      disabled={verifyDeliveryMutation.isPending}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Request Info
                    </Button>
                  </div>

                  {(verificationAction === 'reject' || verificationAction === 'request_info') && (
                    <div className="space-y-3">
                      {verificationAction === 'reject' && (
                        <div>
                          <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                          <Input
                            id="rejectionReason"
                            placeholder="Enter reason for rejection"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="feedback">Feedback (Optional)</Label>
                        <Textarea
                          id="feedback"
                          placeholder="Provide additional feedback or requirements"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleConfirmVerification}
                          disabled={verifyDeliveryMutation.isPending || (verificationAction === 'reject' && !rejectionReason)}
                        >
                          {verifyDeliveryMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          {verificationAction === 'reject' ? 'Confirm Rejection' : 'Send Request'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setVerificationAction('approve')
                            setRejectionReason('')
                            setFeedback('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}