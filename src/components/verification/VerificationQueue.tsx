'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { verificationPriorityBadgeColors } from '@/lib/utils/priority-colors';
import { useVerificationQueue, useVerificationFilters } from '@/hooks/useVerification';
import { StatusIndicator } from './StatusIndicator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Search, 
  Filter,
  MapPin,
  Clock,
  User,
  AlertTriangle
} from 'lucide-react';
import type { VerificationQueueItem, VerificationStatus } from '@/types/verification';

interface VerificationQueueProps {
  className?: string;
  onAssessmentSelect?: (assessment: VerificationQueueItem) => void;
  selectedAssessmentId?: string;
}

export function VerificationQueue({ 
  className, 
  onAssessmentSelect,
  selectedAssessmentId 
}: VerificationQueueProps) {
  const { filters, updateFilter, clearFilters } = useVerificationFilters();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
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

  const toggleExpanded = (assessmentId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(assessmentId)) {
      newExpanded.delete(assessmentId);
    } else {
      newExpanded.add(assessmentId);
    }
    setExpandedItems(newExpanded);
  };

  const handleRefresh = () => {
    refetch();
  };

  // Filter assessments by search term
  const filteredAssessments = queueData?.data?.filter(assessment => 
    assessment.entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.assessor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.rapidAssessmentType.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (error) {
    return (
      <Card className={cn('p-6', className)}>
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
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with filters and search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Verification Queue</h2>
          {queueData?.pagination && (
            <Badge variant="secondary">
              {queueData.pagination.total} items
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search assessments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => updateFilter('status', value === 'all' ? undefined : value as VerificationStatus)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="SUBMITTED">Pending</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="AUTO_VERIFIED">Auto-Verified</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          
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
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                    <div className="h-6 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredAssessments.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No assessments found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || Object.keys(filters).length > 1
                  ? 'Try adjusting your search or filters'
                  : 'No assessments are currently pending verification'
                }
              </p>
              {(searchTerm || Object.keys(filters).length > 1) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    clearFilters();
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>
        ) : (
          filteredAssessments.map((assessment) => (
            <AssessmentQueueItem
              key={assessment.id}
              assessment={assessment}
              isExpanded={expandedItems.has(assessment.id)}
              isSelected={selectedAssessmentId === assessment.id}
              onToggleExpanded={() => toggleExpanded(assessment.id)}
              onSelect={() => onAssessmentSelect?.(assessment)}
            />
          ))
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
    </div>
  );
}

// Individual queue item component
interface AssessmentQueueItemProps {
  assessment: VerificationQueueItem;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpanded: () => void;
  onSelect: () => void;
}

function AssessmentQueueItem({
  assessment,
  isExpanded,
  isSelected,
  onToggleExpanded,
  onSelect
}: AssessmentQueueItemProps) {
  return (
    <Card 
      className={cn(
        'transition-all duration-200 cursor-pointer',
        isSelected && 'ring-2 ring-blue-500 border-blue-200',
        'hover:shadow-md'
      )}
      onClick={onSelect}
    >
      <div className="p-4">
        {/* Header row */}
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

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Entity Details</h4>
                <div className="space-y-1 text-gray-600">
                  <div>Type: {assessment.entity.type}</div>
                  <div>ID: {assessment.entity.id}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Assessor Details</h4>
                <div className="space-y-1 text-gray-600">
                  <div>Email: {assessment.assessor.email}</div>
                  <div>ID: {assessment.assessor.id}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Created: {new Date(assessment.createdAt).toLocaleString()}</div>
                <div>Last Updated: {new Date(assessment.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}