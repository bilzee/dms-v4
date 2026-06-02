/**
 * TypeScript interfaces for assessment-based entity-incident relationships
 * 
 * These types represent computed relationship data derived from existing
 * RapidAssessment records, providing aggregated views of entity-incident
 * connections through assessment data.
 */

import type { Entity, Incident, RapidAssessment, Priority, AssessmentType, VerificationStatus } from '@prisma/client';

// Core relationship data computed from assessments
export interface EntityIncidentRelationship {
  entityId: string;
  incidentId: string;
  entity: Entity;
  incident: Incident;
  assessments: RapidAssessment[];
  priorityDistribution: Record<Priority, number>;
  latestAssessment: RapidAssessment;
  totalAssessments: number;
  firstAssessmentDate: Date;
  lastAssessmentDate: Date;
}

// Enhanced Entity with computed relationship data
export interface EntityWithRelationships extends Entity {
  incidents?: Incident[];              // Computed: Related incidents via assessments
  assessmentCount?: number;            // Computed: Total assessments
  incidentCount?: number;              // Computed: Unique incidents
  priorityDistribution?: Record<Priority, number>;
}

// Enhanced Incident with computed relationship data
export interface IncidentWithRelationships extends Incident {
  entities?: Entity[];                 // Computed: Related entities via assessments
  assessmentCount?: number;            // Computed: Total assessments
  entityCount?: number;                // Computed: Unique entities
  priorityDistribution?: Record<Priority, number>;
}

// Timeline item for assessment history visualization
export interface AssessmentTimelineItem {
  assessment: RapidAssessment;
  entity: Entity;
  incident: Incident;
}

// Query parameters for relationship endpoints
export interface RelationshipQueryParams {
  incidentId?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  priorityFilter?: Priority[];
  assessmentTypeFilter?: AssessmentType[];
  verificationStatusFilter?: VerificationStatus[];
  limit?: number;
  offset?: number;
}

// Statistics for dashboard metrics
export interface RelationshipStatistics {
  totalEntities: number;
  totalIncidents: number;
  totalAssessments: number;
  priorityDistribution: Record<Priority, number>;
  assessmentTypeDistribution: {
    HEALTH: number;
    WASH: number;
    SHELTER: number;
    FOOD: number;
    SECURITY: number;
    POPULATION: number;
  };
  verificationStatusDistribution: {
    DRAFT: number;
    SUBMITTED: number;
    VERIFIED: number;
    AUTO_VERIFIED: number;
    REJECTED: number;
  };
}

// API response wrapper for relationship data
export interface RelationshipApiResponse<T> {
  success: boolean;
  data: T;
  statistics?: RelationshipStatistics;
  message?: string;
}

// Timeline query response
export interface TimelineApiResponse {
  success: boolean;
  data: {
    entityId: string;
    incidentId: string;
    assessments: {
      id: string;
      type: AssessmentType;
      priority: Priority;
      date: string;
      verificationStatus: string;
    }[];
  }[];
}