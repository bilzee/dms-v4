'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Filter, 
  RefreshCw,
  Search,
  TrendingUp,
  Activity,
  Users,
  Package,
  Wifi,
  WifiOff,
  Settings,
  BarChart3,
  HeartHandshake
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPrioritySolidColor, getVerificationStatusColor, verificationPrioritySolidColors, verificationStatusBadgeColors } from '@/lib/utils/priority-colors';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';
import { useVerificationQueue, useVerificationFilters } from '@/hooks/useVerification';
import { useRealTimeVerification, useConnectionStatus, useVerificationMetrics } from '@/hooks/useRealTimeVerification';
import { ConnectionStatusIndicator } from '@/components/verification/ConnectionStatusIndicator';
import { ResponseVerificationQueue } from '@/components/dashboards/crisis/ResponseVerificationQueue';
import { QueueFiltersV2, FilterSummary, getDefaultFilters } from '@/components/verification/QueueFiltersV2';
import { VerificationActions } from '@/components/verification/VerificationActions';
import { VerificationAnalytics } from '@/components/verification/VerificationAnalytics';
import type { VerificationQueueItem } from '@/types/verification';

interface VerificationQueueManagementProps {
  className?: string;
}

export function VerificationQueueManagement({ className }: VerificationQueueManagementProps) {
  const [activeTab, setActiveTab] = useState('assessments');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VerificationQueueItem | null>(null);
  const [assessmentFilters, setAssessmentFilters] = useState(() => getDefaultFilters('assessments'));
  const [responseFilters, setResponseFilters] = useState(() => getDefaultFilters('responses'));

  // Use the working authentication-enabled hooks for assessments
  const {
    data: assessmentsData,
    isLoading: assessmentsLoading,
    error: assessmentsError,
    refetch: refetchAssessments
  } = useVerificationQueue({
    status: 'SUBMITTED',
    sortBy: 'rapidAssessmentDate',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });

  // Responses are handled by the ResponseVerificationQueue component internally

  const assessmentsPagination = assessmentsData?.pagination || { page: 1, limit: 20, total: 0 };

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

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          <AssessmentQueueContent
            assessments={assessmentsData?.data || []}
            loading={assessmentsLoading}
            error={assessmentsError?.message || null}
            pagination={assessmentsPagination}
            queueDepth={assessmentsData?.queueDepth}
            metrics={assessmentsData?.metrics}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            onRefresh={refetchAssessments}
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

// Assessment Queue Content Component
function AssessmentQueueContent({
  assessments,
  loading,
  error,
  pagination,
  queueDepth,
  metrics,
  selectedItem,
  setSelectedItem,
  onRefresh
}: {
  assessments: VerificationQueueItem[];
  loading: boolean;
  error: string | null;
  pagination: any;
  queueDepth: any;
  metrics: any;
  selectedItem: VerificationQueueItem | null;
  setSelectedItem: (item: VerificationQueueItem | null) => void;
  onRefresh?: () => void;
}) {
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Error Loading Queue</h3>
            <p className="text-sm">{error || 'Unknown error occurred'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Verification Queue</CardTitle>
            <CardDescription>
              {queueDepth?.total || 0} assessments pending verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ContentSkeleton variant="list" count={5} />
            ) : assessments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">All Caught Up!</h3>
                <p>No assessments pending verification.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assessments.map((assessment) => (
                  <AssessmentQueueItem
                    key={assessment.id}
                    assessment={assessment}
                    isSelected={selectedItem?.id === assessment.id}
                    onSelect={() => setSelectedItem(assessment)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      <div className="space-y-4">
        {selectedItem ? (
          <AssessmentDetailsPanel
            assessment={selectedItem}
            onClose={() => setSelectedItem(null)}
            onRefresh={onRefresh}
          />
        ) : (
          <Card className="h-96 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p>Select an assessment to view details</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// Delivery Queue Content Component
function DeliveryQueueContent({
  deliveries,
  loading,
  error,
  pagination,
  queueDepth,
  metrics,
  selectedItem,
  setSelectedItem,
  showFilters
}: {
  deliveries: VerificationQueueItem[];
  loading: boolean;
  error: string | null;
  pagination: any;
  queueDepth: any;
  metrics: any;
  selectedItem: VerificationQueueItem | null;
  setSelectedItem: (item: VerificationQueueItem | null) => void;
  showFilters: boolean;
}) {
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Error Loading Queue</h3>
            <p className="text-sm">{error || 'Unknown error occurred'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Verification Queue</CardTitle>
            <CardDescription>
              {queueDepth?.total || 0} deliveries pending verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ContentSkeleton variant="list" count={5} />
            ) : deliveries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">All Caught Up!</h3>
                <p>No deliveries pending verification.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deliveries.map((delivery) => (
                  <DeliveryQueueItem
                    key={delivery.id}
                    delivery={delivery}
                    isSelected={selectedItem?.id === delivery.id}
                    onSelect={() => setSelectedItem(delivery)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {selectedItem ? (
          <DeliveryDetailsPanel
            delivery={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        ) : (
          <Card className="h-96 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2" />
              <p>Select a delivery to view details</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// Assessment Queue Item Component
function AssessmentQueueItem({
  assessment,
  isSelected,
  onSelect
}: {
  assessment: VerificationQueueItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        'p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50',
        isSelected && 'border-blue-500 bg-blue-50'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={getPrioritySolidColor(assessment.priority)}>
              {assessment.priority}
            </Badge>
            <Badge className={getVerificationStatusColor(assessment.verificationStatus)}>
              {assessment.verificationStatus}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {assessment.rapidAssessmentType}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Entity:</span> {assessment.entity.name}
            </div>
            <div>
              <span className="font-medium">Assessor:</span> {assessment.assessor?.name}
            </div>
            <div>
              <span className="font-medium">Date:</span> {
                assessment.rapidAssessmentDate 
                  ? new Date(assessment.rapidAssessmentDate).toLocaleDateString()
                  : 'N/A'
              }
            </div>
          </div>
          
          {assessment.location && (
            <div className="text-sm text-muted-foreground mt-1">
              <span className="font-medium">Location:</span> {assessment.location}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Delivery Queue Item Component
function DeliveryQueueItem({
  delivery,
  isSelected,
  onSelect
}: {
  delivery: VerificationQueueItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        'p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50',
        isSelected && 'border-blue-500 bg-blue-50'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={getPrioritySolidColor(delivery.priority)}>
              {delivery.priority}
            </Badge>
            <Badge className={getVerificationStatusColor(delivery.verificationStatus)}>
              {delivery.verificationStatus}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {delivery.rapidAssessmentType}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Entity:</span> {delivery.entity.name}
            </div>
            <div>
              <span className="font-medium">Responder:</span> {delivery.responder?.name}
            </div>
            <div>
              <span className="font-medium">Delivery Date:</span> {
                delivery.responseDate 
                  ? new Date(delivery.responseDate).toLocaleDateString()
                  : 'N/A'
              }
            </div>
          </div>
          
          {delivery.location && (
            <div className="text-sm text-muted-foreground mt-1">
              <span className="font-medium">Location:</span> {delivery.location}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Assessment Details Panel Component
function AssessmentDetailsPanel({
  assessment,
  onClose,
  onRefresh
}: {
  assessment: VerificationQueueItem;
  onClose: () => void;
  onRefresh?: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Assessment Details</CardTitle>
        <CardDescription>
          {assessment.entity.name} - {assessment.rapidAssessmentType}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600">Status</label>
            <Badge className={verificationStatusBadgeColors[assessment.verificationStatus] ?? ''}>
              {assessment.verificationStatus}
            </Badge>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Priority</label>
            <div className="mt-1">
              <Badge className={verificationPrioritySolidColors[assessment.priority as keyof typeof verificationPrioritySolidColors] ?? 'bg-gray-500 text-white'}>
                {assessment.priority}
              </Badge>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Assessor</label>
            <p className="text-sm text-gray-900 mt-1">
              {assessment.assessor?.name}
            </p>
            <p className="text-xs text-gray-600">
              {assessment.assessor?.email}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Entity</label>
            <p className="text-sm text-gray-900 mt-1">
              {assessment.entity.name}
            </p>
            <p className="text-xs text-gray-600">
              {assessment.entity.type}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Assessment Date</label>
            <p className="text-sm text-gray-900 mt-1">
              {assessment.rapidAssessmentDate 
                ? new Date(assessment.rapidAssessmentDate).toLocaleDateString()
                : 'N/A'
              }
            </p>
          </div>

          {assessment.location && (
            <div>
              <label className="text-sm font-medium text-gray-600">Location</label>
              <p className="text-sm text-gray-900 mt-1">{assessment.location}</p>
            </div>
          )}
        </div>

        <VerificationActions 
          assessment={assessment}
          inline={false}
          onActionComplete={() => {
            onClose();
            // Refresh the queue
            onRefresh?.(); // Use hook-based refresh instead of store-based
          }}
        />
      </CardContent>
    </Card>
  );
}

// Delivery Details Panel Component
function DeliveryDetailsPanel({
  delivery,
  onClose
}: {
  delivery: VerificationQueueItem;
  onClose: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Delivery Details</CardTitle>
        <CardDescription>
          {delivery.entity.name} - {delivery.rapidAssessmentType}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600">Status</label>
            <Badge className={verificationStatusBadgeColors[delivery.verificationStatus] ?? ''}>
              {delivery.verificationStatus}
            </Badge>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Priority</label>
            <div className="mt-1">
              <Badge className={verificationPrioritySolidColors[delivery.priority as keyof typeof verificationPrioritySolidColors] ?? 'bg-gray-500 text-white'}>
                {delivery.priority}
              </Badge>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Responder</label>
            <p className="text-sm text-gray-900 mt-1">
              {delivery.responder?.name}
            </p>
            <p className="text-xs text-gray-600">
              {delivery.responder?.email}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Entity</label>
            <p className="text-sm text-gray-900 mt-1">
              {delivery.entity.name}
            </p>
            <p className="text-xs text-gray-600">
              {delivery.entity.type}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Delivery Date</label>
            <p className="text-sm text-gray-900 mt-1">
              {delivery.responseDate 
                ? new Date(delivery.responseDate).toLocaleDateString()
                : 'N/A'
              }
            </p>
          </div>

          {delivery.location && (
            <div>
              <label className="text-sm font-medium text-gray-600">Location</label>
              <p className="text-sm text-gray-900 mt-1">{delivery.location}</p>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t">
          <Button className="w-full" onClick={onClose}>
            Verify Delivery
          </Button>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Request More Information
          </Button>
          <Button variant="outline" className="w-full text-red-600 hover:text-red-700" onClick={onClose}>
            Reject Delivery
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}