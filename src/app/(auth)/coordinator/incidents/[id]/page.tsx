/**
 * Incident Detail Page for Coordinators
 * 
 * Comprehensive incident management view with assessment-based entity relationships,
 * timeline visualization, and integrated assessment relationship dashboard.
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { useCoordinatorIncident, useIncidentAssessmentSummary } from '@/hooks/useCoordinatorIncident';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  Users, 
  FileText,
  TrendingUp,
  Activity,
  Network,
  ArrowLeft
} from '@/lib/icons';

// Dynamic imports for client-side only components
const AssessmentRelationshipMap = dynamic(
  () => import('@/components/coordinator/AssessmentRelationshipMap').then(mod => ({ default: mod.AssessmentRelationshipMap })),
  { 
    ssr: false,
    loading: () => <div className="h-96 w-full flex items-center justify-center bg-muted rounded-lg">Loading map...</div>
  }
);

const AssessmentTimeline = dynamic(
  () => import('@/components/coordinator/AssessmentTimeline').then(mod => ({ default: mod.AssessmentTimeline })),
  { 
    ssr: false,
    loading: () => <div className="h-64 w-full flex items-center justify-center bg-muted rounded-lg">Loading timeline...</div>
  }
);
import { format } from 'date-fns';
import Link from 'next/link';

interface IncidentDetailPageProps {
  params: {
    id: string;
  };
}


export default function IncidentDetailPage({ params }: IncidentDetailPageProps) {
  const incidentId = params.id;

  // Fetch incident details
  const { data: incident, isLoading, error } = useCoordinatorIncident(incidentId);

  // Get assessment summary for this incident
  const { data: assessmentSummary, isLoading: summaryLoading } = useIncidentAssessmentSummary(incidentId);

  if (isLoading) {
    return <div>Loading incident details...</div>;
  }

  if (error) {
    if (error.message === 'Incident not found') {
      notFound();
    }
    return <div>Error loading incident details.</div>;
  }

  if (!incident) {
    return <div>Incident not found.</div>;
  }

  const incidentData = incident;

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center gap-4">
        <Link href="/coordinator/incidents">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Incidents
          </Button>
        </Link>
      </div>

      {/* Incident Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{incidentData.type} Incident</h1>
          <p className="text-muted-foreground mt-1">{incidentData.description}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge 
            status={incidentData.severity} 
            domain="severity" 
            label={`${incidentData.severity} Priority`} 
          />
          <Badge variant="outline">
            {incidentData.status}
          </Badge>
        </div>
      </div>

      <StatCardGrid columns={4}>
        <StatCard
          label="Total Assessments"
          value={summaryLoading ? '...' : assessmentSummary?.data?.totalAssessments || 0}
          severity="info"
          icon={FileText}
          loading={summaryLoading}
        />
        <StatCard
          label="Affected Entities"
          value={summaryLoading ? '...' : assessmentSummary?.data?.totalEntities || 0}
          severity="warning"
          icon={Users}
          loading={summaryLoading}
        />
        <StatCard
          label="Critical Priority"
          value={summaryLoading ? '...' : assessmentSummary?.data?.priorityDistribution?.CRITICAL || 0}
          severity="critical"
          icon={AlertTriangle}
          loading={summaryLoading}
        />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p className="text-sm font-medium">{incidentData.location}</p>
              </div>
              <MapPin className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Created {format(new Date(incidentData.createdAt), 'MMM dd, yyyy')}
            </p>
          </CardContent>
        </Card>
      </StatCardGrid>

      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Assessment Priority Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="text-center py-4">Loading priority distribution...</div>
          ) : assessmentSummary?.data?.priorityDistribution ? (
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(assessmentSummary.data.priorityDistribution).map(([priority, count]) => (
                <div key={priority} className="text-center">
                  <div className="text-2xl font-bold">{count as number}</div>
                  <StatusBadge 
                    status={priority} 
                    domain="severity" 
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No priority distribution data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Relationships Tabs */}
      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Relationship Map
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Assessment Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <AssessmentRelationshipMap 
            incidentId={incidentId}
            showTimeline={true}
            onEntitySelect={(entityId) => {
              // Handle entity selection - could navigate to entity detail
              console.log('Selected entity:', entityId);
            }}
            onAssessmentSelect={(assessmentId) => {
              // Handle assessment selection - could open assessment modal
              console.log('Selected assessment:', assessmentId);
            }}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <AssessmentTimeline
            incidentId={incidentId}
            showVerificationStatus={true}
            maxItems={100}
            onAssessmentClick={(assessmentId) => {
              // Handle assessment click - could navigate to assessment detail
              console.log('Assessment clicked:', assessmentId);
            }}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}