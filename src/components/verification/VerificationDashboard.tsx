'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVerificationMetrics, useVerificationQueue } from '@/hooks/useVerification';
import { useResponseVerificationQueue } from '@/hooks/useResponseVerification';
import { VerificationQueue } from './VerificationQueue';
import { StatusIndicator } from './StatusIndicator';
import { ResponseVerificationQueue } from '@/components/dashboards/crisis/ResponseVerificationQueue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  MapPin,
  Calendar,
  User,
  Globe,
  Layers,
  Paperclip
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { VerificationQueueItem } from '@/types/verification';
import type { ResponseVerificationQueueItem } from '@/types/response-verification';

interface VerificationDashboardProps {
  initialTab?: string;
  highlightId?: string;
}

function AssessmentDetailPanel({ assessment }: { assessment: VerificationQueueItem }) {
  return (
    <ScrollArea className="h-[calc(100vh-20rem)]">
      <div className="space-y-4 pr-4">
        <div>
          <h3 className="text-lg font-semibold">{assessment.entity.name}</h3>
          <p className="text-sm text-muted-foreground">
            {assessment.rapidAssessmentType} Assessment
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
            <div className="mt-1">
              <StatusIndicator status={assessment.verificationStatus} size="md" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
            <div className="mt-1">
              <StatusBadge status={assessment.priority} domain="severity" />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Incident</label>
          <div className="mt-1 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{assessment.incident?.name || 'Unknown Incident'}</span>
          </div>
          {assessment.incident?.type && (
            <p className="text-xs text-muted-foreground ml-5.5">{assessment.incident.type}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assessor</label>
          <div className="mt-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{assessment.assessor.name}</span>
            </div>
            <p className="text-xs text-muted-foreground ml-5.5">{assessment.assessor.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assessment Date</label>
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {new Date(assessment.rapidAssessmentDate).toLocaleDateString()}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Version</label>
            <div className="mt-1 text-sm">{assessment.versionNumber || 1}</div>
          </div>
        </div>

        {assessment.location && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</label>
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {assessment.location}
            </div>
          </div>
        )}

        {assessment.coordinates && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Coordinates</label>
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              {typeof assessment.coordinates === 'object' 
                ? `${(assessment.coordinates as any).lat || (assessment.coordinates as any).latitude || ''}, ${(assessment.coordinates as any).lng || (assessment.coordinates as any).longitude || ''}`
                : JSON.stringify(assessment.coordinates)
              }
            </div>
          </div>
        )}

        <Separator />

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entity Details</label>
          <div className="mt-1 space-y-0.5 text-sm">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{assessment.entity.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{assessment.entity.location || 'Not specified'}</span>
            </div>
            {assessment.entity.autoApproveEnabled && (
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-blue-600">Auto-Approve Enabled</span>
              </div>
            )}
          </div>
        </div>

        {assessment.gapAnalysis && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gap Analysis</label>
            <div className="mt-1 space-y-1.5">
              {typeof assessment.gapAnalysis === 'string' ? (
                <p className="text-sm bg-muted p-3 rounded-md">{assessment.gapAnalysis}</p>
              ) : Array.isArray(assessment.gapAnalysis) ? (
                assessment.gapAnalysis.map((item: any, idx: number) => (
                  <div key={idx} className="bg-muted p-2.5 rounded-md text-sm space-y-1">
                    {item.category && <div className="font-medium flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-500" />{item.category}</div>}
                    {item.severity && <Badge variant="outline" className="text-xs">{item.severity}</Badge>}
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    {item.gap && <p className="text-xs text-muted-foreground">Gap: {item.gap}</p>}
                    {item.recommendedAction && <p className="text-xs text-muted-foreground">Action: {item.recommendedAction}</p>}
                    {typeof item === 'object' && !item.category && Object.entries(item).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                        <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                ))
              ) : typeof assessment.gapAnalysis === 'object' ? (
                Object.entries(assessment.gapAnalysis).map(([key, value]) => (
                  <div key={key} className="bg-muted p-2.5 rounded-md text-sm">
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    {typeof value === 'object' && value !== null ? (
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                            <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">{String(value)}</p>
                    )}
                  </div>
                ))
              ) : null}
            </div>
          </div>
        )}

        {assessment.mediaAttachments && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Attachments</label>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              {Array.isArray(assessment.mediaAttachments) 
                ? `${assessment.mediaAttachments.length} file(s) attached`
                : 'Media attached'
              }
            </div>
          </div>
        )}

        {assessment.isOfflineCreated && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2.5">
            <p className="text-xs text-yellow-700">
              This assessment was created offline and synced.
            </p>
          </div>
        )}

        <Separator />

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timeline</label>
          <div className="mt-1 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Created: {new Date(assessment.createdAt).toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3 w-3" />
              Updated: {new Date(assessment.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

function ResponseDetailPanel({ response }: { response: ResponseVerificationQueueItem }) {
  return (
    <ScrollArea className="h-[calc(100vh-20rem)]">
      <div className="space-y-4 pr-4">
        <div>
          <h3 className="text-lg font-semibold">{response.entity.name}</h3>
          <p className="text-sm text-muted-foreground">
            {response.type} Response
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Verification Status</label>
            <div className="mt-1">
              <Badge variant="outline" className={cn(
                'text-xs',
                response.verificationStatus === 'VERIFIED' && 'bg-green-50 text-green-700 border-green-300',
                response.verificationStatus === 'REJECTED' && 'bg-red-50 text-red-700 border-red-300',
                response.verificationStatus === 'AUTO_VERIFIED' && 'bg-blue-50 text-blue-700 border-blue-300',
                response.verificationStatus === 'SUBMITTED' && 'bg-yellow-50 text-yellow-700 border-yellow-300',
              )}>
                {response.verificationStatus.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
            <div className="mt-1">
              <StatusBadge status={response.priority} domain="severity" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Delivery Status</label>
            <div className="mt-1">
              <Badge variant="outline" className="text-xs">
                {response.deliveryStatus}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Response Type</label>
            <div className="mt-1 text-sm">{response.type}</div>
          </div>
        </div>

        <Separator />

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Responder</label>
          <div className="mt-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{response.responder.name}</span>
            </div>
            <p className="text-xs text-muted-foreground ml-5.5">{response.responder.email}</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entity</label>
          <div className="mt-1 space-y-0.5 text-sm">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{response.entity.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{response.entity.location || 'Not specified'}</span>
            </div>
          </div>
        </div>

        {response.assessment && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Linked Assessment</label>
            <div className="mt-1 text-sm space-y-0.5">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{response.assessment.rapidAssessmentType}</span>
              </div>
              <p className="text-xs text-muted-foreground ml-5.5">
                {new Date(response.assessment.rapidAssessmentDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {response.description && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <div className="mt-1 text-sm bg-muted p-3 rounded-md">
              {response.description}
            </div>
          </div>
        )}

        {response.planCommitments && response.planCommitments.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Donor Commitments</label>
            <div className="mt-1 space-y-2">
              {response.planCommitments.map((pc, i) => (
                <div key={pc.id || i} className="bg-muted p-2.5 rounded-md text-sm space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{pc.commitment.donor.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5.5">
                    {pc.commitment.donor.contactEmail}
                  </p>
                  {pc.commitment.totalCommittedQuantity > 0 && (
                    <p className="text-xs text-muted-foreground ml-5.5">
                      Committed: {pc.commitment.totalCommittedQuantity} units
                    </p>
                  )}
                  {pc.commitment.items && (
                    <div className="ml-5.5 space-y-1">
                      {Array.isArray(pc.commitment.items) ? (
                        pc.commitment.items.map((item: any, idx: number) => (
                          <div key={idx} className="bg-background p-2 rounded text-xs space-y-0.5">
                            {item.name && <span className="font-medium">{item.name}</span>}
                            {item.description && <p className="text-muted-foreground">{item.description}</p>}
                            {item.quantity && <span className="text-muted-foreground">Qty: {item.quantity}</span>}
                            {item.unit && <span className="text-muted-foreground"> {item.unit}</span>}
                            {typeof item === 'object' && !item.name && Object.entries(item).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                              </div>
                            ))}
                          </div>
                        ))
                      ) : typeof pc.commitment.items === 'object' ? (
                        Object.entries(pc.commitment.items as Record<string, unknown>).map(([k, v]) => (
                          <div key={k} className="bg-background p-2 rounded text-xs flex justify-between">
                            <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="font-medium">{String(v)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">{String(pc.commitment.items)}</p>
                      )}
                    </div>
                  )}
                  {pc.commitment.notes && (
                    <p className="text-xs text-muted-foreground ml-5.5 italic">
                      {pc.commitment.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {response.resources && typeof response.resources === 'object' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resources</label>
            <div className="mt-1 space-y-1.5">
              {Object.entries(response.resources as Record<string, unknown>).map(([key, value]) => (
                <div key={key} className="bg-muted p-2.5 rounded-md text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  </div>
                  <Badge variant="secondary" className="font-medium">{String(value)}</Badge>
                </div>
              ))}
            </div>
          </div>
        )
        }
        {response.resources && typeof response.resources === 'string' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resources</label>
            <div className="mt-1 bg-muted p-3 rounded-md">
              <p className="text-sm">{response.resources}</p>
            </div>
          </div>
        )}

        <Separator />

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timeline</label>
          <div className="mt-1 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Created: {new Date(response.createdAt).toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3 w-3" />
              Updated: {new Date(response.updatedAt).toLocaleString()}
            </div>
            {response.verifiedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                Verified: {new Date(response.verifiedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export function VerificationDashboard({ initialTab, highlightId }: VerificationDashboardProps) {
  const router = useRouter();
  const [selectedAssessment, setSelectedAssessment] = useState<VerificationQueueItem | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<ResponseVerificationQueueItem | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [autoSelectAttempted, setAutoSelectAttempted] = useState(false);

  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    error: metricsError,
    refetch: refetchMetrics 
  } = useVerificationMetrics();

  const { 
    data: assessmentQueueData 
  } = useVerificationQueue({ page: 1, limit: 50 });

  const {
    data: responseQueueData
  } = useResponseVerificationQueue({ page: 1, limit: 50 });

  useEffect(() => {
    if (autoSelectAttempted || !highlightId) return;

    if (initialTab === 'queue' && assessmentQueueData?.data) {
      const match = assessmentQueueData.data.find((a: VerificationQueueItem) => a.id === highlightId);
      if (match) {
        setSelectedAssessment(match);
        setAutoSelectAttempted(true);
      }
    }

    if (initialTab === 'responses' && responseQueueData?.data) {
      const match = responseQueueData.data.find((r: ResponseVerificationQueueItem) => r.id === highlightId);
      if (match) {
        setSelectedResponse(match);
        setAutoSelectAttempted(true);
      }
    }
  }, [autoSelectAttempted, highlightId, initialTab, assessmentQueueData, responseQueueData]);

  const handleAssessmentSelect = (assessment: VerificationQueueItem) => {
    setSelectedAssessment(assessment);
    setActiveTab('queue');
  };

  const handleActionComplete = () => {
    setSelectedAssessment(null);
    refetchMetrics();
  };

  const handleResponseActionComplete = () => {
    setSelectedResponse(null);
    refetchMetrics();
  };

  const handleResponseSelect = (response: ResponseVerificationQueueItem) => {
    setSelectedResponse(response);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verification Queue</h1>
          <p className="text-muted-foreground hidden sm:block">
            Review and verify assessment submissions and response deliveries
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => refetchMetrics()}
          disabled={metricsLoading}
        >
          <RefreshCw className={cn('h-4 w-4 sm:mr-2', metricsLoading && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

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
                onActionComplete={handleActionComplete}
              />
            </div>

            <div>
              {selectedAssessment ? (
                <Card className="sticky top-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Assessment Details</CardTitle>
                    <CardDescription>
                      Full assessment data for review before acting
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AssessmentDetailPanel assessment={selectedAssessment} />
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-64 flex items-center justify-center sticky top-6">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Select an assessment to view details</p>
                    <p className="text-xs mt-1">Approve/reject buttons appear when you expand a list item</p>
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
                onResponseSelect={handleResponseSelect}
                selectedResponseId={selectedResponse?.id}
                onActionComplete={handleResponseActionComplete}
              />
            </div>

            <div>
              {selectedResponse ? (
                <Card className="sticky top-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Response Details</CardTitle>
                    <CardDescription>
                      Full response data for review before acting
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponseDetailPanel response={selectedResponse} />
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-64 flex items-center justify-center sticky top-6">
                  <div className="text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Select a response to view details</p>
                    <p className="text-xs mt-1">Approve/reject buttons appear when you expand a list item</p>
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
