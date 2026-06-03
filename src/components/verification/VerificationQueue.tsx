'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { verificationPriorityBadgeColors } from '@/lib/utils/priority-colors';
import { useVerificationQueue, useVerificationFilters } from '@/hooks/useVerification';
import { VerificationActions } from './VerificationActions';
import { StatusIndicator } from './StatusIndicator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataCardList, type ExpandedCardProps } from '@/components/shared/DataCardList';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MapPin,
  Clock,
  User,
  AlertTriangle
} from '@/lib/icons';
import { type SeverityLevel } from '@/lib/utils/status-colors';
import type { VerificationQueueItem, VerificationStatus } from '@/types/verification';

const getQueueSeverity = (priority: string): SeverityLevel => {
  switch (priority) {
    case 'CRITICAL': return 'critical'
    case 'HIGH': return 'high'
    case 'MEDIUM': return 'medium'
    case 'LOW': return 'low'
    default: return 'info'
  }
}

interface VerificationQueueProps {
  className?: string;
  onAssessmentSelect?: (assessment: VerificationQueueItem) => void;
  selectedAssessmentId?: string;
  onActionComplete?: () => void;
}

export function VerificationQueue({ 
  className, 
  onAssessmentSelect,
  selectedAssessmentId,
  onActionComplete
}: VerificationQueueProps) {
  const { filters, updateFilter } = useVerificationFilters();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { 
    data: queueData, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useVerificationQueue({
    ...filters,
    page: currentPage,
    limit: 10
  });

  const handleRefresh = () => {
    refetch();
  };

  const filteredAssessments = queueData?.data?.filter(assessment => 
    assessment.entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.assessor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.rapidAssessmentType.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const statusFilterValue = filters.status || '';

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') {
      updateFilter('status', (value || undefined) as VerificationStatus | undefined);
    }
  };

  if (error) {
    return (
      <div className={cn('p-6 rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load verification queue
          </h3>
          <p className="text-gray-600 mb-4">
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
    <DataCardList
      className={className}
      title="Assessment Verification Queue"
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
      data={filteredAssessments}
      loading={isLoading}
      emptyMessage={
        searchTerm || Object.keys(filters).length > 1
          ? 'No assessments found. Try adjusting your search or filters.'
          : 'No assessments are currently pending verification'
      }
      emptyType={searchTerm || Object.keys(filters).length > 1 ? 'search' : 'data'}
      searchable
      searchPlaceholder="Search assessments..."
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      filters={[
        {
          key: 'status',
          label: 'Status',
          options: [
            { label: 'Pending', value: 'SUBMITTED' },
            { label: 'Verified', value: 'VERIFIED' },
            { label: 'Auto-Verified', value: 'AUTO_VERIFIED' },
            { label: 'Rejected', value: 'REJECTED' },
          ],
        },
      ]}
      filterValues={{ status: statusFilterValue }}
      onFilterChange={handleFilterChange}
      expandable
      getSeverity={(assessment) => getQueueSeverity(assessment.priority)}
      renderCard={(assessment: VerificationQueueItem, { isExpanded, toggleExpand }: ExpandedCardProps) => (
        <div onClick={() => onAssessmentSelect?.(assessment)} className="cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {assessment.entity.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {assessment.rapidAssessmentType} Assessment
                </p>
              </div>
              
              {assessment.entity.autoApproveEnabled && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  Auto-Approve Enabled
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                className={cn(
                  'font-medium',
                  verificationPriorityBadgeColors[assessment.priority as keyof typeof verificationPriorityBadgeColors]
                )}
              >
                {assessment.priority}
              </Badge>
              
              <StatusIndicator 
                status={assessment.verificationStatus} 
                size="sm" 
              />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand();
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

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{assessment.assessor.name}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{assessment.entity.location || 'Location not specified'}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{new Date(assessment.rapidAssessmentDate).toLocaleDateString()}</span>
            </div>
          </div>

          {assessment.incident?.name && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <AlertTriangle className="h-3 w-3" />
              <span>Incident: {assessment.incident.name}</span>
            </div>
          )}
        </div>
      )}
      renderExpanded={(assessment: VerificationQueueItem) => (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Entity Details</h4>
              <div className="space-y-1 text-gray-600">
                <div>Type: {assessment.entity.type}</div>
                <div>Location: {assessment.entity.location || 'Not specified'}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Assessor Details</h4>
              <div className="space-y-1 text-gray-600">
                <div>Name: {assessment.assessor.name}</div>
                <div>Email: {assessment.assessor.email}</div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Assessment Date: {new Date(assessment.rapidAssessmentDate).toLocaleString()}</div>
                <div>Submitted: {new Date(assessment.createdAt).toLocaleString()}</div>
                <div>Last Updated: {new Date(assessment.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {assessment.verificationStatus === 'SUBMITTED' && (
            <VerificationActions
              assessment={assessment}
              inline={false}
              onActionComplete={onActionComplete}
            />
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
  );
}
