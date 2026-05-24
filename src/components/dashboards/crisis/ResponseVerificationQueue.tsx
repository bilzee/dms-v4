'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { verificationPriorityBadgeColors, responseStatusBadgeColors } from '@/lib/utils/priority-colors';
import { useResponseVerificationQueue, useVerifyResponse, useRejectResponse } from '@/hooks/useResponseVerification';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Search, 
  Filter,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HeartHandshake,
  Package
} from 'lucide-react';
import type { ResponseVerificationQueueItem } from '@/types/response-verification';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';

interface ResponseVerificationQueueProps {
  className?: string;
  onResponseSelect?: (response: ResponseVerificationQueueItem) => void;
  selectedResponseId?: string;
  filters?: any;
}

export function ResponseVerificationQueue({ 
  className, 
  onResponseSelect,
  selectedResponseId,
  filters: parentFilters
}: ResponseVerificationQueueProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
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

  const toggleExpanded = (responseId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(responseId)) {
      newExpanded.delete(responseId);
    } else {
      newExpanded.add(responseId);
    }
    setExpandedItems(newExpanded);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleVerify = async (responseId: string, notes?: string) => {
    try {
      await verifyResponse.mutateAsync({
        responseId,
        data: { notes }
      });
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
      
      // Reset reject form
      setRejectingResponse(null);
      setRejectReason('');
      setRejectNotes('');
    } catch (error) {
      console.error('Failed to reject response:', error);
    }
  };

  const effectiveSearch = searchFromParent || searchTerm;

  const filteredResponses = queueData?.data?.filter(response => 
    response.entity.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
    response.responder.name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
    response.type.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
    (response.donor?.name && response.donor.name.toLowerCase().includes(effectiveSearch.toLowerCase()))
  ) || [];

  if (error) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load response verification queue
          </h3>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)} data-testid="response-verification-queue">
      {/* Header with filters and search */}
      <div className="flex items-center justify-between" data-testid="verification-filters">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Response Verification Queue</h2>
          {queueData?.pagination && (
            <Badge variant="secondary">
              {queueData.pagination.total} items
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search responses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Queue items */}
      <div className="space-y-3" data-testid="response-queue-table">
        {isLoading ? (
          <ContentSkeleton variant="card" count={5} />
        ) : filteredResponses.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No responses found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? 'Try adjusting your search or use the filters panel'
                  : 'No responses are currently pending verification'
                }
              </p>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <>
            <div data-testid="response-metrics-summary" className="mb-4">
              {/* Metrics summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div data-testid="total-pending-responses" className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-lg font-bold">{queueData?.statistics?.submitted || 0}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div data-testid="total-verified-responses" className="text-center p-2 bg-green-50 rounded">
                  <div className="text-lg font-bold">{queueData?.statistics?.verified || 0}</div>
                  <div className="text-sm text-gray-600">Verified</div>
                </div>
                <div data-testid="total-rejected-responses" className="text-center p-2 bg-red-50 rounded">
                  <div className="text-lg font-bold">{queueData?.statistics?.rejected || 0}</div>
                  <div className="text-sm text-gray-600">Rejected</div>
                </div>
                <div data-testid="verification-rate" className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-lg font-bold">{queueData?.statistics?.total && queueData.statistics.total > 0 ? Math.round((queueData.statistics.verified / queueData.statistics.total) * 100) : 0}%</div>
                  <div className="text-sm text-gray-600">Rate</div>
                </div>
              </div>
              <div data-testid="average-processing-time" className="text-center p-2 bg-gray-50 rounded mb-4">
                <div className="text-lg font-bold">{(queueData?.statistics as any)?.avgProcessingTime ? `${(queueData?.statistics as any)?.avgProcessingTime}h` : 'N/A'}</div>
                <div className="text-sm text-gray-600">Avg Processing Time</div>
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
              <div data-testid="processing-time-chart" className="bg-gray-100 h-32 rounded flex items-center justify-center text-gray-500">
                Processing Time Chart Placeholder
              </div>
            </div>
            
            {filteredResponses.map((response) => (
            <ResponseQueueItem
              key={response.id}
              response={response}
              isExpanded={expandedItems.has(response.id)}
              isSelected={selectedResponseId === response.id}
              onToggleExpanded={() => toggleExpanded(response.id)}
              onSelect={() => onResponseSelect?.(response)}
              onVerify={(notes) => handleVerify(response.id, notes)}
              onReject={() => setRejectingResponse(response.id)}
              isVerifying={verifyResponse.isPending}
              isRejecting={rejectResponse.isPending}
              testId="response-row"
            />
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {queueData?.pagination && queueData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, queueData?.pagination?.total ?? 0)} of {queueData?.pagination?.total ?? 0} results
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <span className="text-sm">
              Page {currentPage} of {queueData?.pagination?.totalPages ?? 1}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(queueData?.pagination?.totalPages ?? 1, p + 1))}
              disabled={currentPage === (queueData?.pagination?.totalPages ?? 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Rejection Dialog */}
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

// Individual queue item component
interface ResponseQueueItemProps {
  response: ResponseVerificationQueueItem;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpanded: () => void;
  onSelect: () => void;
  onVerify: (notes?: string) => void;
  onReject: () => void;
  isVerifying: boolean;
  isRejecting: boolean;
  testId?: string;
}

function ResponseQueueItem({
  response,
  isExpanded,
  isSelected,
  onToggleExpanded,
  onSelect,
  onVerify,
  onReject,
  isVerifying,
  isRejecting,
  testId
}: ResponseQueueItemProps) {
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

  return (
    <Card 
      className={cn(
        'transition-all duration-200 cursor-pointer',
        isSelected && 'ring-2 ring-blue-500 border-blue-200',
        'hover:shadow-md'
      )}
      onClick={onSelect}
      data-testid={testId || `response-row`}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {getResponseTypeIcon(response.type)}
                {response.entity.name}
              </h3>
              <p className="text-sm text-gray-600">
                {response.type} Response • {response.responder.name}
              </p>
              {response.donor && (
                <p className="text-sm text-blue-600">
                  Donor: {response.donor.name}
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
                responseStatusBadgeColors[response.status as keyof typeof responseStatusBadgeColors]
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
                onToggleExpanded();
              }}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Quick info row */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
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
          <p className="text-sm text-gray-700 mb-2 line-clamp-2">
            {response.description}
          </p>
        )}

        {/* Action buttons for submitted responses */}
        {response.verificationStatus === 'SUBMITTED' && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onVerify();
              }}
              disabled={isVerifying}
              className="bg-green-600 hover:bg-green-700"
              data-testid="verify-response-btn"
            >
              {isVerifying ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <CheckCircle className="h-3 w-3 mr-1" />
              )}
              Verify
            </Button>
            
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onReject();
              }}
              disabled={isRejecting}
              data-testid="reject-response-btn"
            >
              {isRejecting ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              Reject
            </Button>
          </div>
        )}

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Entity Details</h4>
                <div className="space-y-1 text-gray-600">
                  <div>Type: {response.entity.type}</div>
                  <div>ID: {response.entity.id}</div>
                  <div>Auto-Approve: {response.entity.autoApproveEnabled ? 'Enabled' : 'Disabled'}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Responder Details</h4>
                <div className="space-y-1 text-gray-600">
                  <div>Email: {response.responder.email}</div>
                  <div>ID: {response.responder.id}</div>
                </div>
              </div>
            </div>
            
            {/* Donor information if available */}
            {response.donor && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Donor Information</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Name: {response.donor.name}</div>
                  <div>Email: {response.donor.email}</div>
                  {response.commitment && (
                    <div>
                      Commitment: {response.commitment.description} 
                      {response.commitment.amount && ` ($${response.commitment.amount})`}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Timeline */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Created: {new Date(response.createdAt).toLocaleString()}</div>
                <div>Last Updated: {new Date(response.updatedAt).toLocaleString()}</div>
                {response.verifiedAt && (
                  <div>Verified: {new Date(response.verifiedAt).toLocaleString()}</div>
                )}
              </div>
            </div>
            
            {/* Resources information */}
            {response.resources && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Resources</h4>
                <div className="text-sm text-gray-600">
                  <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
                    {JSON.stringify(response.resources, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}