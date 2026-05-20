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
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

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

// Priority styling
const PRIORITY_STYLES = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  LOW: 'bg-green-100 text-green-800 border-green-300',
} as const;

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

  if (!incident?.data) {
    return <div>Incident not found.</div>;
  }

  const incidentData = incident.data;

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
          <Badge 
            variant="outline" 
            className={PRIORITY_STYLES[incidentData.severity as keyof typeof PRIORITY_STYLES] || 'bg-gray-100 text-gray-800 border-gray-300'}
          >
            {incidentData.severity} Priority
          </Badge>
          <Badge variant="outline">
            {incidentData.status}
          </Badge>
        </div>
      </div>

      {/* Incident Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assessments</p>
                <p className="text-2xl font-bold">
                  {summaryLoading ? '...' : assessmentSummary?.data?.totalAssessments || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Affected Entities</p>
                <p className="text-2xl font-bold">
                  {summaryLoading ? '...' : assessmentSummary?.data?.totalEntities || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Priority</p>
                <p className="text-2xl font-bold">
                  {summaryLoading ? '...' : assessmentSummary?.data?.priorityDistribution?.CRITICAL || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

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
      </div>

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
                  <Badge 
                    variant="outline" 
                    className={PRIORITY_STYLES[priority as keyof typeof PRIORITY_STYLES]}
                  >
                    {priority}
                  </Badge>
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