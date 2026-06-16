'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVerificationMetrics } from '@/hooks/useVerification';
import { useResponseVerificationMetrics } from '@/hooks/useResponseVerificationMetrics';
import { VerificationQueue } from './VerificationQueue';
import { ResponseVerificationQueue } from '@/components/dashboards/crisis/ResponseVerificationQueue';
import { VerificationActions } from './VerificationActions';
import { StatusIndicator } from './StatusIndicator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
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
  HeartHandshake,
  Package,
  Activity
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { VerificationQueueItem } from '@/types/verification';
import type { ResponseVerificationQueueItem } from '@/types/response-verification';

export function EnhancedVerificationDashboard() {
  const router = useRouter();
  const [selectedAssessment, setSelectedAssessment] = useState<VerificationQueueItem | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<ResponseVerificationQueueItem | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    error: metricsError,
    refetch: refetchMetrics 
  } = useVerificationMetrics();

  const { 
    data: responseMetrics, 
    isLoading: responseMetricsLoading, 
    error: responseMetricsError,
    refetch: refetchResponseMetrics 
  } = useResponseVerificationMetrics();

  const handleAssessmentSelect = (assessment: VerificationQueueItem) => {
    setSelectedAssessment(assessment);
    setSelectedResponse(null);
    setActiveTab('assessment-queue');
  };

  const handleResponseSelect = (response: ResponseVerificationQueueItem) => {
    setSelectedResponse(response);
    setSelectedAssessment(null);
    setActiveTab('response-queue');
  };

  const handleActionComplete = () => {
    setSelectedAssessment(null);
    setSelectedResponse(null);
    refetchMetrics();
    refetchResponseMetrics();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verification Management</h1>
          <p className="text-muted-foreground hidden sm:block">
            Review and approve assessments and response submissions from field teams
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => {
            refetchMetrics();
            refetchResponseMetrics();
          }}
          disabled={metricsLoading || responseMetricsLoading}
        >
          <RefreshCw className={cn('h-4 w-4 sm:mr-2', (metricsLoading || responseMetricsLoading) && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Metrics Overview */}
      <StatCardGrid columns={4}>
        <StatCard
          label="Pending Assessments"
          value={metrics?.totalPending || 0}
          icon={FileText}
          severity="warning"
          loading={metricsLoading}
        />
        
        <StatCard
          label="Pending Responses"
          value={responseMetrics?.totalPending || 0}
          icon={HeartHandshake}
          severity="info"
          loading={responseMetricsLoading}
        />
        
        <StatCard
          label="Verified Today"
          value={(metrics?.totalVerified || 0) + (responseMetrics?.totalVerified || 0)}
          icon={CheckCircle}
          severity="success"
          loading={metricsLoading || responseMetricsLoading}
        />
        
        <StatCard
          label="Auto-Verified"
          value={(metrics?.totalAutoVerified || 0) + (responseMetrics?.totalAutoVerified || 0)}
          icon={Shield}
          severity="info"
          loading={metricsLoading || responseMetricsLoading}
        />
      </StatCardGrid>

      {/* Performance Metrics */}
      {metrics && (
        <StatCardGrid columns={4}>
          <StatCard
            label="Assessment Verification Rate"
            value={`${(metrics.verificationRate * 100).toFixed(1)}%`}
            severity="success"
            variant="compact"
          />
          
          <StatCard
            label="Response Verification Rate"
            value={`${responseMetrics ? (responseMetrics.verificationRate * 100).toFixed(1) : 0.0}%`}
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessment-queue">Assessments</TabsTrigger>
          <TabsTrigger value="response-queue">Responses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="auto-approval">Auto-Approval</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
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
                  onClick={() => setActiveTab('assessment-queue')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Pending Assessments ({metrics?.totalPending || 0})
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('response-queue')}
                >
                  <HeartHandshake className="h-4 w-4 mr-2" />
                  View Pending Responses ({responseMetrics?.totalPending || 0})
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
                  disabled={!(metrics?.totalPending || 0) && !(responseMetrics?.totalPending || 0)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Verification Actions
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('auto-approval')}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Auto-Approval Settings
                </Button>
              </CardContent>
            </Card>

            {/* Verification Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Status Overview</CardTitle>
                <CardDescription>
                  Current status distribution across all verification types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">Pending Verification</span>
                    </div>
                    <Badge variant="secondary">{metrics?.totalPending || 0}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Verified</span>
                    </div>
                    <Badge variant="secondary">{metrics?.totalVerified || 0}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Auto-Verified</span>
                    </div>
                    <Badge variant="secondary">{metrics?.totalAutoVerified || 0}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium">Rejected</span>
                    </div>
                    <Badge variant="secondary">{metrics?.totalRejected || 0}</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex justify-between mb-1">
                      <span>Total Pending Items:</span>
                      <span className="font-semibold">{(metrics?.totalPending || 0) + (responseMetrics?.totalPending || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Verification Rate:</span>
                      <span className="font-semibold text-green-600">{((metrics?.verificationRate || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assessment-queue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Assessment Verification Queue */}
            <div className="lg:col-span-2">
              <VerificationQueue 
                onAssessmentSelect={handleAssessmentSelect}
                selectedAssessmentId={selectedAssessment?.id}
              />
            </div>

            {/* Selected Assessment Actions */}
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
                    {/* Status */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">
                        <StatusIndicator 
                          status={selectedAssessment.verificationStatus} 
                          size="md" 
                        />
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Priority</label>
                      <div className="mt-1">
                        <StatusBadge status={selectedAssessment.priority} domain="severity" />
                      </div>
                    </div>

                    {/* Assessment Details */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Assessor</label>
                      <p className="text-sm text-foreground mt-1">
                        {selectedAssessment.assessor.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedAssessment.assessor.email}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date</label>
                      <p className="text-sm text-foreground mt-1">
                        {new Date(selectedAssessment.rapidAssessmentDate).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
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

        <TabsContent value="response-queue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Response Verification Queue */}
            <div className="lg:col-span-2">
              <ResponseVerificationQueue 
                onResponseSelect={handleResponseSelect}
                selectedResponseId={selectedResponse?.id}
              />
            </div>

            {/* Selected Response Actions */}
            <div className="space-y-4">
              {selectedResponse ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Response Details</CardTitle>
                    <CardDescription>
                      {selectedResponse.entity.name} - {selectedResponse.type} Response
                      {selectedResponse.planCommitments && selectedResponse.planCommitments.length > 0 && (
                        <div className="text-sm text-blue-600 mt-1">
                          Donor: {selectedResponse.planCommitments[0].commitment.donor.name}
                        </div>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Status */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Verification Status</label>
                      <div className="mt-1">
                        <StatusBadge status={selectedResponse.verificationStatus} domain="verification" />
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Priority</label>
                      <div className="mt-1">
                        <StatusBadge status={selectedResponse.priority} domain="severity" />
                      </div>
                    </div>

                    {/* Response Details */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Responder</label>
                      <p className="text-sm text-foreground mt-1">
                        {selectedResponse.responder.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedResponse.responder.email}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date</label>
                      <p className="text-sm text-foreground mt-1">
                        {new Date(selectedResponse.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Donor Information */}
                    {selectedResponse.planCommitments && selectedResponse.planCommitments.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Donor Information</label>
                        <div className="mt-1 p-2 bg-blue-50 rounded border border-blue-200">
                          {selectedResponse.planCommitments.map((pc, idx) => (
                            <div key={idx}>
                              <p className="text-sm text-blue-900 font-medium">{pc.commitment.donor.name}</p>
                              <p className="text-xs text-blue-700">{pc.commitment.donor.contactEmail}</p>
                              <p className="text-xs text-blue-600 mt-1">
                                Commitment: {pc.commitment.totalCommittedQuantity || 0} items
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response Resources */}
                    {selectedResponse.resources && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Response Resources</label>
                        <div className="mt-1 p-2 bg-muted rounded border text-xs">
                          <pre className="whitespace-pre-wrap text-foreground">
                            {JSON.stringify(selectedResponse.resources, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Action buttons would go here */}
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground text-center">
                        Response verification actions will be available here
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-64 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <HeartHandshake className="h-8 w-8 mx-auto mb-2" />
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
                Performance metrics and trends for both assessment and response verification
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

        <TabsContent value="auto-approval" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Auto-Approval Configuration
              </CardTitle>
              <CardDescription>
                Configure automatic verification settings for assessments and responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">Auto-approval settings will be available here.</p>
                <Button 
                  onClick={() => router.push('/coordinator/verification/auto-approval')}
                  variant="outline"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Go to Auto-Approval Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

