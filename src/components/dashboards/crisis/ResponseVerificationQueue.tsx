'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { verificationPriorityBadgeColors, deliveryStatusBadgeColors } from '@/lib/utils/priority-colors';
import { useResponseVerificationQueue, useVerifyResponse, useRejectResponse } from '@/hooks/useResponseVerification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RefreshCw,
  MapPin,
  Clock,
  User,
  CheckCircle,
  XCircle,
  HeartHandshake,
  Package
} from '@/lib/icons';
import { DataCardList, type ExpandedCardProps } from '@/components/shared/DataCardList';
import { type SeverityLevel } from '@/lib/utils/status-colors';
import type { ResponseVerificationQueueItem } from '@/types/response-verification';

const getSeverity = (priority: string): SeverityLevel => {
  switch (priority) {
    case 'CRITICAL': return 'critical';
    case 'HIGH': return 'high';
    case 'MEDIUM': return 'medium';
    case 'LOW': return 'low';
    default: return 'info';
  }
};

interface ResponseVerificationQueueProps {
  className?: string;
  onResponseSelect?: (response: ResponseVerificationQueueItem) => void;
  selectedResponseId?: string;
  filters?: any;
  onActionComplete?: () => void;
}

export function ResponseVerificationQueue({
  className,
  onResponseSelect,
  selectedResponseId,
  filters: parentFilters,
  onActionComplete
}: ResponseVerificationQueueProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rejectingResponse, setRejectingResponse] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  const searchFromParent = parentFilters?.search || '';

  const {
    data: queueData,
    isLoading,
    error,
    refetch,
    isFetching
  } = useResponseVerificationQueue({
    verificationStatus: parentFilters?.status?.[0],
    responseType: parentFilters?.responseType?.[0],
    priority: parentFilters?.priority?.[0],
    page: currentPage,
    limit: 10
  });

  const verifyResponse = useVerifyResponse();
  const rejectResponse = useRejectResponse();

  const handleRefresh = () => {
    refetch();
  };

  const handleVerify = async (responseId: string, notes?: string) => {
    try {
      await verifyResponse.mutateAsync({
        responseId,
        data: { notes }
      });
      onActionComplete?.();
    } catch (error) {
      console.error('Failed to verify response:', error);
    }
  };

  const handleReject = async (responseId: string) => {
    try {
      await rejectResponse.mutateAsync({
        responseId,
        data: {
          rejectionReason: rejectReason,
          notes: rejectNotes
        }
      });

      setRejectingResponse(null);
      setRejectReason('');
      setRejectNotes('');
      onActionComplete?.();
    } catch (error) {
      console.error('Failed to reject response:', error);
    }
  };

  const effectiveSearch = searchFromParent || searchTerm;

  const filteredResponses = queueData?.data?.filter(response =>
    response.entity.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
    response.responder.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
    response.type.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
    (response.planCommitments?.[0]?.commitment?.donor?.name && response.planCommitments[0].commitment.donor.name.toLowerCase().includes(effectiveSearch.toLowerCase()))
  ) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-3 w-3 text-red-600" />;
      case 'AUTO_VERIFIED':
        return <CheckCircle className="h-3 w-3 text-blue-600" />;
      default:
        return <Clock className="h-3 w-3 text-yellow-600" />;
    }
  };

  const getResponseTypeIcon = (type: string) => {
    switch (type) {
      case 'LOGISTICS':
        return <Package className="h-3 w-3" />;
      default:
        return <HeartHandshake className="h-3 w-3" />;
    }
  };

  if (error) {
    return (
      <div className={cn('p-6 rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Failed to load response verification queue
          </h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)} data-testid="response-verification-queue">
      {/* Metrics summary - outside DataCardList as a sibling above */}
      {filteredResponses.length > 0 && (
        <div data-testid="response-metrics-summary">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div data-testid="total-pending-responses" className="text-center p-2 bg-yellow-50 rounded">
              <div className="text-lg font-bold">{queueData?.statistics?.submitted || 0}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div data-testid="total-verified-responses" className="text-center p-2 bg-green-50 rounded">
              <div className="text-lg font-bold">{queueData?.statistics?.verified || 0}</div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </div>
            <div data-testid="total-rejected-responses" className="text-center p-2 bg-red-50 rounded">
              <div className="text-lg font-bold">{queueData?.statistics?.rejected || 0}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </div>
            <div data-testid="verification-rate" className="text-center p-2 bg-blue-50 rounded">
              <div className="text-lg font-bold">{queueData?.statistics?.total && queueData.statistics.total > 0 ? Math.round((queueData.statistics.verified / queueData.statistics.total) * 100) : 0}%</div>
              <div className="text-sm text-muted-foreground">Rate</div>
            </div>
          </div>
          <div data-testid="average-processing-time" className="text-center p-2 bg-muted rounded mb-4">
            <div className="text-lg font-bold">{(queueData?.statistics as any)?.avgProcessingTime ? `${(queueData?.statistics as any)?.avgProcessingTime}h` : 'N/A'}</div>
            <div className="text-sm text-muted-foreground">Avg Processing Time</div>
          </div>
          <div data-testid="response-breakdown-by-type" className="mb-4">
            <h4 className="font-medium mb-2">Breakdown by Type</h4>
            <div className="space-y-1 text-sm">
              {['HEALTH', 'WASH', 'SHELTER', 'FOOD'].map(type => {
                const count = filteredResponses.filter(r => r.type === type).length;
                return count > 0 ? (
                  <div key={type} className="flex justify-between">
                    <span>{type}</span>
                    <span>{count}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
          <div data-testid="processing-time-chart" className="bg-muted h-32 rounded flex items-center justify-center text-muted-foreground">
            Processing Time Chart Placeholder
          </div>
        </div>
      )}

      {/* DataCardList */}
      <div data-testid="response-queue-table">
      <DataCardList
        title="Response Verification Queue"
        headerActions={
          <div className="flex items-center gap-2">
            {queueData?.pagination && (
              <Badge variant="secondary">
                {queueData.pagination.total} items
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        }
        data={filteredResponses}
        loading={isLoading}
        emptyMessage={
          effectiveSearch
            ? 'No responses found. Try adjusting your search or filters.'
            : 'No responses are currently pending verification'
        }
        emptyType={effectiveSearch ? 'search' : 'data'}
        searchable
        searchPlaceholder="Search responses..."
        searchValue={effectiveSearch}
        onSearchChange={setSearchTerm}
        expandable
        getSeverity={(response) => getSeverity(response.priority)}
        renderCard={(response: ResponseVerificationQueueItem, { isExpanded, toggleExpand }: ExpandedCardProps) => (
          <div
            onClick={() => onResponseSelect?.(response)}
            className={cn(
              'cursor-pointer',
              selectedResponseId === response.id && 'ring-2 ring-blue-500 border-blue-200 rounded-lg -m-1 p-1'
            )}
            data-testid="response-row"
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {getResponseTypeIcon(response.type)}
                    {response.entity.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {response.type} Response &bull; {response.responder.name}
                  </p>
                  {response.planCommitments?.[0]?.commitment?.donor && (
                    <p className="text-sm text-blue-600">
                      Donor: {response.planCommitments[0].commitment.donor.name}
                    </p>
                  )}
                </div>

                {response.entity.autoApproveEnabled && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    Auto-Approve Enabled
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    'font-medium',
                    verificationPriorityBadgeColors[response.priority as keyof typeof verificationPriorityBadgeColors]
                  )}
                >
                  {response.priority}
                </Badge>

                <Badge
                  className={cn(
                    'font-medium flex items-center gap-1',
                    deliveryStatusBadgeColors[response.deliveryStatus as keyof typeof deliveryStatusBadgeColors]
                  )}
                >
                  {getStatusIcon(response.verificationStatus)}
                  {response.verificationStatus.replace('_', ' ')}
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand();
                  }}
                >
                  {isExpanded ? '\u25B2' : '\u25BC'}
                </Button>
              </div>
            </div>

            {/* Quick info row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{response.responder.name}</span>
              </div>

              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{response.entity.location || 'Location not specified'}</span>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{new Date(response.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Description preview */}
            {response.description && (
              <p className="text-sm text-foreground mb-2 line-clamp-2">
                {response.description}
              </p>
            )}
          </div>
        )}
        renderExpanded={(response: ResponseVerificationQueueItem) => (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">Entity Details</h4>
                <div className="space-y-1 text-muted-foreground">
                  <div>Type: {response.entity.type}</div>
                  <div>ID: {response.entity.id}</div>
                  <div>Auto-Approve: {response.entity.autoApproveEnabled ? 'Enabled' : 'Disabled'}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Responder Details</h4>
                <div className="space-y-1 text-muted-foreground">
                  <div>Email: {response.responder.email}</div>
                  <div>ID: {response.responder.id}</div>
                </div>
              </div>

              {response.planCommitments?.[0]?.commitment?.donor && (
                <div className="md:col-span-2">
                  <h4 className="font-medium text-foreground mb-2">Donor Information</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Name: {response.planCommitments[0].commitment.donor.name}</div>
                    <div>Email: {response.planCommitments[0].commitment.donor.contactEmail}</div>
                    {response.planCommitments[0].commitment && (
                      <div>
                        Commitment: {response.planCommitments[0].commitment.id.slice(-6)}
                        {response.planCommitments[0].commitment.notes && ` - ${response.planCommitments[0].commitment.notes}`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <h4 className="font-medium text-foreground mb-2">Timeline</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Created: {new Date(response.createdAt).toLocaleString()}</div>
                  <div>Last Updated: {new Date(response.updatedAt).toLocaleString()}</div>
                  {response.verifiedAt && (
                    <div>Verified: {new Date(response.verifiedAt).toLocaleString()}</div>
                  )}
                </div>
              </div>

              {response.resources && (
                <div className="md:col-span-2">
                  <h4 className="font-medium text-foreground mb-2">Resources</h4>
                  <div className="space-y-1">
                    {typeof response.resources === 'string' ? (
                      <p className="text-sm bg-muted p-2 rounded">{response.resources}</p>
                    ) : typeof response.resources === 'object' ? (
                      (() => {
                        const resources = response.resources as Record<string, unknown>;
                        const entries = Object.entries(resources);
                        return entries.map(([key, value]) => {
                          if (value === null || value === undefined || value === '') return null;
                          let displayValue: string;
                          if (typeof value === 'object') {
                            const obj = value as Record<string, unknown>;
                            if (typeof obj.latitude === 'number' || typeof obj.latitude === 'string') {
                              displayValue = `${obj.latitude}, ${obj.longitude}`;
                            } else if (Array.isArray(value)) {
                              displayValue = `${(value as unknown[]).length} item(s)`;
                            } else {
                              displayValue = JSON.stringify(value);
                            }
                          } else {
                            displayValue = String(value);
                          }
                          return (
                            <div key={key} className="bg-muted p-2 rounded text-sm flex items-center justify-between">
                              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                              <span className="font-medium">{displayValue}</span>
                            </div>
                          );
                        });
                      })()
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {response.verificationStatus === 'SUBMITTED' && (
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVerify(response.id);
                  }}
                  disabled={verifyResponse.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="verify-response-btn"
                >
                  {verifyResponse.isPending ? (
                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  )}
                  Verify Response
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRejectingResponse(response.id);
                  }}
                  disabled={rejectResponse.isPending}
                  data-testid="reject-response-btn"
                >
                  {rejectResponse.isPending ? (
                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  Reject Response
                </Button>
              </div>
            )}
          </div>
        )}
        pagination={
          queueData?.pagination
            ? {
                pageSize: 10,
                total: queueData.pagination.total,
                currentPage,
                onPageChange: setCurrentPage,
              }
            : undefined
        }
      />
      </div>

      {/* Rejection Dialog - outside DataCardList as a sibling */}
      <AlertDialog open={!!rejectingResponse} onOpenChange={() => setRejectingResponse(null)}>
        <AlertDialogContent data-testid="reject-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Response</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this response. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 my-4">
            <div>
              <label className="text-sm font-medium">Rejection Reason *</label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="mt-1"
                data-testid="rejection-reason"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Additional Notes</label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Optional additional notes..."
                className="mt-1 w-full p-2 border border-gray-300 rounded-md resize-none"
                rows={3}
                data-testid="rejection-feedback"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-reject-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectingResponse && handleReject(rejectingResponse)}
              disabled={!rejectReason.trim() || rejectResponse.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-reject-btn"
            >
              Reject Response
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
