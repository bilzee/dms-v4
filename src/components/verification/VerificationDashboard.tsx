'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVerificationMetrics } from '@/hooks/useVerification';
import { VerificationQueue } from './VerificationQueue';
import { VerificationActions } from './VerificationActions';
import { StatusIndicator } from './StatusIndicator';
import { ResponseVerificationQueue } from '@/components/dashboards/crisis/ResponseVerificationQueue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VerificationQueueItem } from '@/types/verification';

export function VerificationDashboard() {
  const router = useRouter();
  const [selectedAssessment, setSelectedAssessment] = useState<VerificationQueueItem | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    error: metricsError,
    refetch: refetchMetrics 
  } = useVerificationMetrics();

  const handleAssessmentSelect = (assessment: VerificationQueueItem) => {
    setSelectedAssessment(assessment);
    setActiveTab('queue');
  };

  const handleActionComplete = () => {
    setSelectedAssessment(null);
    refetchMetrics();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessment Verification</h1>
          <p className="text-muted-foreground">
            Review and approve assessment submissions from field assessors
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Pending Verification"
          value={metrics?.totalPending || 0}
          icon={Clock}
          className="border-amber-200 bg-amber-50"
          iconClassName="text-amber-600"
          loading={metricsLoading}
        />
        
        <MetricCard
          title="Verified Today"
          value={metrics?.totalVerified || 0}
          icon={CheckCircle}
          className="border-green-200 bg-green-50"
          iconClassName="text-green-600"
          loading={metricsLoading}
        />
        
        <MetricCard
          title="Auto-Verified"
          value={metrics?.totalAutoVerified || 0}
          icon={Shield}
          className="border-blue-200 bg-blue-50"
          iconClassName="text-blue-600"
          loading={metricsLoading}
        />
        
        <MetricCard
          title="Rejected"
          value={metrics?.totalRejected || 0}
          icon={XCircle}
          className="border-red-200 bg-red-50"
          iconClassName="text-red-600"
          loading={metricsLoading}
        />
      </div>

      {/* Performance Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Verification Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(metrics.verificationRate * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                of submitted assessments approved
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(metrics.averageProcessingTime / 60)}m
              </div>
              <p className="text-xs text-muted-foreground">
                average time to verify
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejection Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {(metrics.rejectionRate * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                of submitted assessments rejected
              </p>
            </CardContent>
          </Card>
        </div>
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
            {/* Quick Actions */}
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

            {/* Assessment Types Breakdown */}
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
            {/* Verification Queue */}
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
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
                        <StatusIndicator 
                          status={selectedAssessment.verificationStatus} 
                          size="md" 
                        />
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="text-sm font-medium text-gray-600">Priority</label>
                      <div className="mt-1">
                        <Badge 
                          className={cn(
                            selectedAssessment.priority === 'CRITICAL' && 'bg-red-100 text-red-800 border-red-300',
                            selectedAssessment.priority === 'HIGH' && 'bg-orange-100 text-orange-800 border-orange-300',
                            selectedAssessment.priority === 'MEDIUM' && 'bg-yellow-100 text-yellow-800 border-yellow-300',
                            selectedAssessment.priority === 'LOW' && 'bg-green-100 text-green-800 border-green-300'
                          )}
                        >
                          {selectedAssessment.priority}
                        </Badge>
                      </div>
                    </div>

                    {/* Assessment Details */}
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

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Response Verification Queue
              </CardTitle>
              <CardDescription>
                Review and verify humanitarian response deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div data-testid="response-verification-queue-wrapper">
                <ResponseVerificationQueue />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  iconClassName?: string;
  loading?: boolean;
}

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  className, 
  iconClassName, 
  loading 
}: MetricCardProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {loading ? (
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            )}
          </div>
          <Icon className={cn('h-6 w-6', iconClassName)} />
        </div>
      </CardContent>
    </Card>
  );
}