'use client';

import React, { useState } from 'react';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  Filter,
  RefreshCw,
  TrendingUp,
  Activity,
  BarChart3,
  HeartHandshake,
  MapPin
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { getPrioritySolidColor, getVerificationStatusColor } from '@/lib/utils/priority-colors';
import { DataCardList, type ExpandedCardProps } from '@/components/shared/DataCardList';
import { useVerificationQueue } from '@/hooks/useVerification';
import { useRealTimeVerification, useVerificationMetrics } from '@/hooks/useRealTimeVerification';
import { ConnectionStatusIndicator } from '@/components/verification/ConnectionStatusIndicator';
import { ResponseVerificationQueue } from '@/components/dashboards/crisis/ResponseVerificationQueue';
import { QueueFiltersV2, getDefaultFilters } from '@/components/verification/QueueFiltersV2';
import { VerificationActions } from '@/components/verification/VerificationActions';
import { VerificationAnalytics } from '@/components/verification/VerificationAnalytics';
import type { VerificationQueueItem } from '@/types/verification';
import { type SeverityLevel } from '@/lib/utils/status-colors';

interface VerificationQueueManagementProps {
  className?: string;
}

const getAssessmentSeverity = (priority: string): SeverityLevel => {
  switch (priority) {
    case 'CRITICAL': return 'critical';
    case 'HIGH': return 'high';
    case 'MEDIUM': return 'medium';
    case 'LOW': return 'low';
    default: return 'info';
  }
};

export function VerificationQueueManagement({ className }: VerificationQueueManagementProps) {
  const [activeTab, setActiveTab] = useState('assessments');
  const [showFilters, setShowFilters] = useState(false);
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [assessmentFilters, setAssessmentFilters] = useState(() => getDefaultFilters('assessments'));
  const [responseFilters, setResponseFilters] = useState(() => getDefaultFilters('responses'));

  // Use the working authentication-enabled hooks for assessments
  const {
    data: assessmentsData,
    isLoading: assessmentsLoading,
    refetch: refetchAssessments
  } = useVerificationQueue({
    status: 'SUBMITTED',
    sortBy: 'rapidAssessmentDate',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });

  // Responses are handled by the ResponseVerificationQueue component internally

  const {
    combined: combinedMetrics
  } = useVerificationMetrics();

  // Real-time updates hook
  const {
    isConnected,
    connectionStatus,
    lastUpdate,
    manualRefresh,
    refreshAssessments: refreshAssessmentsRealTime,
    refreshDeliveries: refreshDeliveriesRealTime,
    enabled: realTimeEnabled
  } = useRealTimeVerification({
    enabled: false, // Disabled - prevent infinite polling
    interval: 0,
    onConnectionChange: (status) => {
      console.log('Real-time connection status changed:', status);
    },
    onDataUpdate: (type) => {
      console.log('Real-time data updated:', type);
    }
  });

  // Enhanced refresh functions
  const handleRefreshAssessments = () => {
    refreshAssessmentsRealTime();
  };

  const handleRefreshDeliveries = () => {
    refreshDeliveriesRealTime();
  };

  const handleRefreshAll = () => {
    manualRefresh();
  };

  const handleAssessmentFiltersChange = (newFilters: Partial<typeof assessmentFilters>) => {
    setAssessmentFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResponseFiltersChange = (newFilters: Partial<typeof responseFilters>) => {
    setResponseFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearAssessmentFilters = () => {
    setAssessmentFilters(getDefaultFilters('assessments'));
  };

  const handleClearResponseFilters = () => {
    setResponseFilters(getDefaultFilters('responses'));
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setShowFilters(false);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Real-time Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Verification Queue Management</h2>
          <p className="text-muted-foreground">
            Review and verify assessments and delivery responses
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <ConnectionStatusIndicator showDetails />

          <Button
            variant="outline"
            onClick={handleRefreshAll}
            disabled={assessmentsLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2',
              assessmentsLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Queue Overview Cards */}
      <StatCardGrid columns={4}>
        <StatCard
          label="Pending Assessments"
          value={assessmentsData?.queueDepth?.total || 0}
          severity="warning"
          icon={Clock}
        />
        <StatCard
          label="Response Queue"
          value="-"
          severity="warning"
          icon={HeartHandshake}
        />
        <StatCard
          label="Total Pending"
          value={combinedMetrics.totalPending}
          severity="warning"
          icon={Activity}
        />
        <StatCard
          label="Verification Rate"
          value={`${(combinedMetrics.verificationRate * 100).toFixed(1)}%`}
          severity="success"
          icon={TrendingUp}
        />
      </StatCardGrid>

      {/* Main Queue Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assessments" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Assessments
              {(assessmentsData?.queueDepth?.total || 0) > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {assessmentsData?.queueDepth?.total || 0}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="responses" className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4" />
              Responses
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        <TabsContent value="assessments" className="space-y-4">
          <QueueFiltersV2
            type="assessments"
            filters={assessmentFilters}
            onFiltersChange={handleAssessmentFiltersChange}
            onClear={handleClearAssessmentFilters}
            visible={showFilters}
            onClose={() => setShowFilters(false)}
            loading={assessmentsLoading}
          />
          <DataCardList
            title="Assessment Verification Queue"
            description={`${assessmentsData?.queueDepth?.total || 0} assessments pending verification`}
            data={assessmentsData?.data || []}
            loading={assessmentsLoading}
            emptyMessage="No assessments pending verification"
            emptyType="data"
            searchable
            searchPlaceholder="Search assessments..."
            searchValue={assessmentSearch}
            onSearchChange={setAssessmentSearch}
            expandable
            getSeverity={(assessment) => getAssessmentSeverity(assessment.priority)}
            pagination={
              assessmentsData?.pagination
                ? {
                    pageSize: 20,
                    total: assessmentsData.pagination.total,
                    currentPage: assessmentsData.pagination.page || 1,
                    onPageChange: () => {},
                  }
                : undefined
            }
            headerActions={
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{assessmentsData?.data?.length || 0} items</Badge>
                <Button variant="outline" size="sm" onClick={() => refetchAssessments()} disabled={assessmentsLoading}>
                  <RefreshCw className={cn('h-4 w-4', assessmentsLoading && 'animate-spin')} />
                </Button>
              </div>
            }
            renderCard={(assessment: VerificationQueueItem, { isExpanded, toggleExpand }: ExpandedCardProps) => (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{assessment.entity.name}</h3>
                    <p className="text-sm text-gray-600">
                      {assessment.rapidAssessmentType} &bull; {assessment.assessor?.name || 'Unknown Assessor'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPrioritySolidColor(assessment.priority)}>
                      {assessment.priority}
                    </Badge>
                    <Badge className={getVerificationStatusColor(assessment.verificationStatus)}>
                      {assessment.verificationStatus}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleExpand(); }}>
                      {isExpanded ? '\u25B2' : '\u25BC'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  {assessment.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{assessment.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{assessment.rapidAssessmentDate ? new Date(assessment.rapidAssessmentDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                <VerificationActions
                  assessment={assessment}
                  inline={true}
                  onActionComplete={() => refetchAssessments()}
                />
              </div>
            )}
            renderExpanded={(assessment: VerificationQueueItem) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Assessment Details</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>Type: {assessment.rapidAssessmentType}</div>
                    <div>ID: {assessment.id}</div>
                    <div>Entity Type: {assessment.entity.type}</div>
                    <div>Auto-Approve: {assessment.entity.autoApproveEnabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Assessor Details</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>Name: {assessment.assessor?.name || 'N/A'}</div>
                    <div>Email: {assessment.assessor?.email || 'N/A'}</div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>Created: {new Date(assessment.createdAt).toLocaleString()}</div>
                    <div>Last Updated: {new Date(assessment.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <QueueFiltersV2
            type="responses"
            filters={responseFilters}
            onFiltersChange={handleResponseFiltersChange}
            onClear={handleClearResponseFilters}
            visible={showFilters}
            onClose={() => setShowFilters(false)}
          />
          <ResponseVerificationQueue filters={responseFilters} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <VerificationAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
