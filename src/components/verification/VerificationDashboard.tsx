'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVerificationMetrics } from '@/hooks/useVerification';
import { useVerifyResponse, useRejectResponse } from '@/hooks/useResponseVerification';
import { VerificationQueue } from './VerificationQueue';
import { VerificationActions } from './VerificationActions';
import { StatusIndicator } from './StatusIndicator';
import { ResponseVerificationQueue } from '@/components/dashboards/crisis/ResponseVerificationQueue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  FileText,
  Users,
  BarChart3,
  Package,
  MapPin
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { VerificationQueueItem } from '@/types/verification';
import type { ResponseVerificationQueueItem } from '@/types/response-verification';

export function VerificationDashboard() {
  const router = useRouter();
  const [selectedAssessment, setSelectedAssessment] = useState<VerificationQueueItem | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<ResponseVerificationQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    error: metricsError,
    refetch: refetchMetrics 
  } = useVerificationMetrics();

  const verifyResponse = useVerifyResponse();
  const rejectResponse = useRejectResponse();

  const handleAssessmentSelect = (assessment: VerificationQueueItem) => {
    setSelectedAssessment(assessment);
    setActiveTab('queue');
  };

  const handleActionComplete = () => {
    setSelectedAssessment(null);
    refetchMetrics();
  };

  const handleResponseVerify = async () => {
    if (!selectedResponse) return;
    try {
      await verifyResponse.mutateAsync({
        responseId: selectedResponse.id,
        data: { notes: '' }
      });
      setSelectedResponse(null);
      refetchMetrics();
    } catch (error) {
      console.error('Failed to verify response:', error);
    }
  };

  const handleResponseReject = async () => {
    if (!selectedResponse || !rejectReason.trim()) return;
    try {
      await rejectResponse.mutateAsync({
        responseId: selectedResponse.id,
        data: {
          rejectionReason: rejectReason,
          notes: ''
        }
      });
      setSelectedResponse(null);
      setRejectReason('');
      refetchMetrics();
    } catch (error) {
      console.error('Failed to reject response:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verification Queue</h1>
          <p className="text-muted-foreground">
            Review and verify assessment submissions and response deliveries
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => refetchMetrics()}
          disabled={metricsLoading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', metricsLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Metrics Overview */}
      <StatCardGrid columns={4}>
        <StatCard
          label="Pending Verification"
          value={metrics?.totalPending || 0}
          icon={Clock}
          severity="warning"
          loading={metricsLoading}
        />
        
        <StatCard
          label="Verified Today"
          value={metrics?.totalVerified || 0}
          icon={CheckCircle}
          severity="success"
          loading={metricsLoading}
        />
        
        <StatCard
          label="Auto-Verified"
          value={metrics?.totalAutoVerified || 0}
          icon={Shield}
          severity="info"
          loading={metricsLoading}
        />
        
        <StatCard
          label="Rejected"
          value={metrics?.totalRejected || 0}
          icon={XCircle}
          severity="critical"
          loading={metricsLoading}
        />
      </StatCardGrid>

      {/* Performance Metrics */}
      {metrics && (
        <StatCardGrid columns={3}>
          <StatCard
            label="Verification Rate"
            value={`${(metrics.verificationRate * 100).toFixed(1)}%`}
            severity="success"
            variant="compact"
          />
          
          <StatCard
            label="Avg Processing Time"
            value={`${Math.round(metrics.averageProcessingTime / 60)}m`}
            severity="info"
            variant="compact"
          />
          
          <StatCard
            label="Rejection Rate"
            value={`${(metrics.rejectionRate * 100).toFixed(1)}%`}
            severity="critical"
            variant="compact"
          />
        </StatCardGrid>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Assessments</TabsTrigger>
          <TabsTrigger value="responses" data-tab="responses">Responses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common verification tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('queue')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  View Pending Assessments ({metrics?.totalPending || 0})
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('responses')}
                >
                  <Package className="h-4 w-4 mr-2" />
                  View Response Queue
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('analytics')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics & Reports
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  disabled={!metrics?.totalPending}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Verification Actions
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/coordinator/verification/auto-approval')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Auto-Approval Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending by Assessment Type</CardTitle>
                <CardDescription>
                  Distribution of pending verifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.pendingByType ? (
                  <div className="space-y-2">
                    {Object.entries(metrics.pendingByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{type}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>No pending assessments</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VerificationQueue 
                onAssessmentSelect={handleAssessmentSelect}
                selectedAssessmentId={selectedAssessment?.id}
              />
            </div>

            <div className="space-y-4">
              {selectedAssessment ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assessment Details</CardTitle>
                    <CardDescription>
                      {selectedAssessment.entity.name} - {selectedAssessment.rapidAssessmentType}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        <StatusIndicator 
                          status={selectedAssessment.verificationStatus} 
                          size="md" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Priority</label>
                      <div className="mt-1">
                        <StatusBadge status={selectedAssessment.priority} domain="severity" />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Assessor</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedAssessment.assessor.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {selectedAssessment.assessor.email}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Date</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(selectedAssessment.rapidAssessmentDate).toLocaleDateString()}
                      </p>
                    </div>

                    <VerificationActions 
                      assessment={selectedAssessment}
                      inline={false}
                      onActionComplete={handleActionComplete}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-64 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p>Select an assessment to view details</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ResponseVerificationQueue 
                onResponseSelect={setSelectedResponse}
                selectedResponseId={selectedResponse?.id}
              />
            </div>

            <div className="space-y-4">
              {selectedResponse ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Response Details</CardTitle>
                    <CardDescription>
                      {selectedResponse.entity.name} - {selectedResponse.type} Response
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        <Badge variant="outline" className={cn(
                          selectedResponse.verificationStatus === 'VERIFIED' && 'bg-green-50 text-green-700 border-green-300',
                          selectedResponse.verificationStatus === 'REJECTED' && 'bg-red-50 text-red-700 border-red-300',
                          selectedResponse.verificationStatus === 'AUTO_VERIFIED' && 'bg-blue-50 text-blue-700 border-blue-300',
                          selectedResponse.verificationStatus === 'SUBMITTED' && 'bg-yellow-50 text-yellow-700 border-yellow-300',
                        )}>
                          {selectedResponse.verificationStatus.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Priority</label>
                      <div className="mt-1">
                        <Badge variant="outline">{selectedResponse.priority}</Badge>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Responder</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedResponse.responder.name}</p>
                      <p className="text-xs text-gray-600">{selectedResponse.responder.email}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Location</label>
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-900">
                        <MapPin className="h-3 w-3" />
                        {selectedResponse.entity.location || 'Not specified'}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Date</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(selectedResponse.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {selectedResponse.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="text-sm text-gray-900 mt-1">{selectedResponse.description}</p>
                      </div>
                    )}

                    {selectedResponse.verificationStatus === 'SUBMITTED' && (
                      <div className="space-y-3 pt-4 border-t">
                        <Button
                          className="w-full"
                          onClick={handleResponseVerify}
                          disabled={verifyResponse.isPending}
                        >
                          {verifyResponse.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Verify Response
                        </Button>

                        <div className="space-y-2">
                          <Input
                            placeholder="Rejection reason (required to reject)..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleResponseReject}
                            disabled={!rejectReason.trim() || rejectResponse.isPending}
                          >
                            {rejectResponse.isPending ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Reject Response
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-64 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2" />
                    <p>Select a response to view details</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Verification Analytics
              </CardTitle>
              <CardDescription>
                Performance metrics and trends for assessment verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
                <p>Detailed verification analytics and reporting will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

