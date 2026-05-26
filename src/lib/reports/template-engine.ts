/**
 * Report Template Engine
 * Handles template rendering and validation for custom reports
 */

import { z } from 'zod';
import { ReportType } from '@prisma/client';

export interface ReportLayout {
  id: string;
  type: 'header' | 'footer' | 'section' | 'chart' | 'table' | 'kpi' | 'map';
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
  dataSource?: string;
  visualization?: {
    type: 'bar' | 'line' | 'pie' | 'area' | 'table' | 'map' | 'kpi';
    config: Record<string, any>;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  layout: ReportLayout[];
  createdById: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportFilters {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  entities?: string[];
  incidents?: string[];
  donors?: string[];
  assessmentTypes?: string[];
  responseTypes?: string[];
  status?: string[];
  priorities?: string[];
}

export interface ReportAggregation {
  id: string;
  field: string;
  function: 'sum' | 'count' | 'average' | 'min' | 'max' | 'percentage';
  groupBy?: string[];
  filter?: Record<string, any>;
}

export interface ReportVisualization {
  id: string;
  type: 'chart' | 'table' | 'map' | 'kpi';
  title: string;
  dataSource: string;
  aggregation?: string;
  config: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

// Zod schemas for validation
export const ReportLayoutSchema = z.object({
  id: z.string(),
  type: z.enum(['header', 'footer', 'section', 'chart', 'table', 'kpi', 'map']),
  position: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  config: z.record(z.any()),
  dataSource: z.string().optional(),
  visualization: z.object({
    type: z.enum(['bar', 'line', 'pie', 'area', 'table', 'map', 'kpi']),
    config: z.record(z.any()),
  }).optional(),
});

export const ReportFiltersSchema = z.object({
  dateRange: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
  entities: z.array(z.string()).optional(),
  incidents: z.array(z.string()).optional(),
  donors: z.array(z.string()).optional(),
  assessmentTypes: z.array(z.string()).optional(),
  responseTypes: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  priorities: z.array(z.string()).optional(),
});

export const ReportAggregationSchema = z.object({
  id: z.string(),
  field: z.string(),
  function: z.enum(['sum', 'count', 'average', 'min', 'max', 'percentage']),
  groupBy: z.array(z.string()).optional(),
  filter: z.record(z.any()).optional(),
});

export const ReportVisualizationSchema = z.object({
  id: z.string(),
  type: z.enum(['chart', 'table', 'map', 'kpi']),
  title: z.string(),
  dataSource: z.string(),
  aggregation: z.string().optional(),
  config: z.record(z.any()),
  position: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

// Predefined template definitions
export const DEFAULT_TEMPLATES: Partial<ReportTemplate>[] = [
  {
    name: 'Assessment Summary',
    description: 'Summary of all assessment types by date range',
    type: 'ASSESSMENT',
    isPublic: true,
    layout: [
      {
        id: 'header',
        type: 'header',
        position: { x: 0, y: 0, width: 12, height: 1 },
        config: { title: 'Assessment Summary Report', showDate: true, showFilters: true }
      },
      {
        id: 'kpi-summary',
        type: 'kpi',
        position: { x: 0, y: 1, width: 12, height: 2 },
        config: { title: 'Key Metrics' },
        visualization: {
          type: 'kpi',
          config: {
            metrics: [
              { field: 'totalAssessments', label: 'Total Assessments', aggregation: 'count' },
              { field: 'completedAssessments', label: 'Completed', aggregation: 'count' },
              { field: 'pendingVerification', label: 'Pending Verification', aggregation: 'count' }
            ]
          }
        }
      },
      {
        id: 'assessment-chart',
        type: 'chart',
        position: { x: 0, y: 3, width: 8, height: 4 },
        config: { title: 'Assessments by Type' },
        visualization: {
          type: 'pie',
          config: {
            dataField: 'rapidAssessmentType',
            labelField: 'rapidAssessmentType'
          }
        }
      },
      {
        id: 'assessment-table',
        type: 'table',
        position: { x: 8, y: 3, width: 4, height: 4 },
        config: { title: 'Recent Assessments' },
        visualization: {
          type: 'table',
          config: {
            columns: [
              { field: 'rapidAssessmentType', header: 'Type' },
              { field: 'rapidAssessmentDate', header: 'Date' },
              { field: 'entity.name', header: 'Entity' },
              { field: 'verificationStatus', header: 'Status' }
            ],
            pagination: { pageSize: 10 }
          }
        }
      }
    ]
  },
  {
    name: 'Response Impact Report',
    description: 'Detailed view of response activities and donor contributions',
    type: 'RESPONSE',
    isPublic: true,
    layout: [
      {
        id: 'header',
        type: 'header',
        position: { x: 0, y: 0, width: 12, height: 1 },
        config: { title: 'Response Impact Report', showDate: true, showFilters: true }
      },
      {
        id: 'response-overview',
        type: 'kpi',
        position: { x: 0, y: 1, width: 12, height: 2 },
        config: { title: 'Response Overview' },
        visualization: {
          type: 'kpi',
          config: {
            metrics: [
              { field: 'totalResponses', label: 'Total Responses', aggregation: 'count' },
              { field: 'deliveredResponses', label: 'Delivered', aggregation: 'count' },
              { field: 'totalDonors', label: 'Active Donors', aggregation: 'count' }
            ]
          }
        }
      },
      {
        id: 'donor-contributions',
        type: 'chart',
        position: { x: 0, y: 3, width: 6, height: 4 },
        config: { title: 'Donor Contributions' },
        visualization: {
          type: 'bar',
          config: {
            xAxis: 'donor.name',
            yAxis: 'deliveredQuantity',
            groupBy: 'type'
          }
        }
      },
      {
        id: 'response-timeline',
        type: 'chart',
        position: { x: 6, y: 3, width: 6, height: 4 },
        config: { title: 'Response Timeline' },
        visualization: {
          type: 'line',
          config: {
            xAxis: 'responseDate',
            yAxis: 'deliveredQuantity',
            groupBy: 'type'
          }
        }
      }
    ]
  },
  {
    name: 'Entity Status Dashboard',
    description: 'Current status and needs of affected entities',
    type: 'ENTITY',
    isPublic: true,
    layout: [
      {
        id: 'header',
        type: 'header',
        position: { x: 0, y: 0, width: 12, height: 1 },
        config: { title: 'Entity Status Dashboard', showDate: true, showFilters: true }
      },
      {
        id: 'entity-map',
        type: 'map',
        position: { x: 0, y: 1, width: 8, height: 6 },
        config: { title: 'Entity Locations' },
        visualization: {
          type: 'map',
          config: {
            center: { lat: 9.0820, lng: 8.6753 }, // Nigeria center
            zoom: 6,
            markers: {
              field: 'coordinates',
              popup: ['name', 'type', 'location']
            }
          }
        }
      },
      {
        id: 'entity-summary',
        type: 'table',
        position: { x: 8, y: 1, width: 4, height: 6 },
        config: { title: 'Entity Summary' },
        visualization: {
          type: 'table',
          config: {
            columns: [
              { field: 'name', header: 'Name' },
              { field: 'type', header: 'Type' },
              { field: 'location', header: 'Location' },
              { field: 'isActive', header: 'Status' }
            ]
          }
        }
      }
    ]
  },
  {
    name: 'Donor Performance Report',
    description: 'Donor commitment and delivery performance metrics',
    type: 'DONOR',
    isPublic: true,
    layout: [
      {
        id: 'header',
        type: 'header',
        position: { x: 0, y: 0, width: 12, height: 1 },
        config: { title: 'Donor Performance Report', showDate: true, showFilters: true }
      },
      {
        id: 'donor-performance',
        type: 'kpi',
        position: { x: 0, y: 1, width: 12, height: 2 },
        config: { title: 'Donor Performance Metrics' },
        visualization: {
          type: 'kpi',
          config: {
            metrics: [
              { field: 'totalCommitments', label: 'Total Commitments', aggregation: 'count' },
              { field: 'totalValue', label: 'Total Value', aggregation: 'sum', format: 'currency' },
              { field: 'deliveryRate', label: 'Delivery Rate', aggregation: 'average', format: 'percentage' }
            ]
          }
        }
      },
      {
        id: 'leaderboard',
        type: 'table',
        position: { x: 0, y: 3, width: 12, height: 6 },
        config: { title: 'Donor Leaderboard' },
        visualization: {
          type: 'table',
          config: {
            columns: [
              { field: 'name', header: 'Donor' },
              { field: 'leaderboardRank', header: 'Rank' },
              { field: 'verifiedDeliveryRate', header: 'Delivery Rate', format: 'percentage' },
              { field: 'totalValueEstimated', header: 'Total Value', format: 'currency' }
            ],
            sortBy: [{ field: 'leaderboardRank', direction: 'asc' }]
          }
        }
      }
    ]
  }
];

/**
 * Template validation and rendering utilities
 */
export class ReportTemplateEngine {
  static validateTemplate(template: Partial<ReportTemplate>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.type || !Object.values(ReportType).includes(template.type)) {
      errors.push('Valid template type is required');
    }

    if (!template.layout || template.layout.length === 0) {
      errors.push('Template must have at least one layout element');
    } else {
      const layoutResult = ReportLayoutSchema.array().safeParse(template.layout);
      if (!layoutResult.success) {
        errors.push(`Invalid layout structure: ${layoutResult.error.message}`);
      }
    }

    // Check for overlapping positions
    if (template.layout && template.layout.length > 1) {
      const positions = template.layout.map(item => ({
        id: item.id,
        x: item.position.x,
        y: item.position.y,
        width: item.position.width,
        height: item.position.height
      }));

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          if (this.doPositionsOverlap(positions[i], positions[j])) {
            errors.push(`Layout elements ${positions[i].id} and ${positions[j].id} overlap`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static doPositionsOverlap(pos1: any, pos2: any): boolean {
    return !(
      pos1.x + pos1.width <= pos2.x ||
      pos2.x + pos2.width <= pos1.x ||
      pos1.y + pos1.height <= pos2.y ||
      pos2.y + pos2.height <= pos1.y
    );
  }

  static renderTemplatePreview(template: Partial<ReportTemplate>, realData?: Record<string, any>): string {
    const data = realData || this.generateMockData(template);
    return JSON.stringify({
      template,
      data,
      preview: this.generatePreviewHTML(template, data)
    }, null, 2);
  }

  private static generateMockData(template: Partial<ReportTemplate>): Record<string, any> {
    // Generate mock data based on template type and layout
    const baseData = {
      assessments: Array.from({ length: 50 }, (_, i) => ({
        id: `assessment_${i}`,
        rapidAssessmentType: ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'][Math.floor(Math.random() * 6)],
        rapidAssessmentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        verificationStatus: ['DRAFT', 'SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED'][Math.floor(Math.random() * 4)],
        entity: {
          name: `Entity ${i}`,
          type: 'FACILITY',
          location: `Location ${i}`
        }
      })),
      responses: Array.from({ length: 30 }, (_, i) => ({
        id: `response_${i}`,
        type: ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'][Math.floor(Math.random() * 6)],
        deliveryStatus: ['PLANNED', 'DELIVERED'][Math.floor(Math.random() * 2)],
        deliveredQuantity: Math.floor(Math.random() * 1000),
        donor: {
          name: `Donor ${Math.floor(i / 5) + 1}`
        }
      })),
      entities: Array.from({ length: 20 }, (_, i) => ({
        id: `entity_${i}`,
        name: `Entity ${i}`,
        type: ['COMMUNITY', 'WARD', 'LGA', 'FACILITY', 'CAMP'][Math.floor(Math.random() * 5)],
        location: `Location ${i}`,
        coordinates: {
          lat: 9.0820 + (Math.random() - 0.5) * 2,
          lng: 8.6753 + (Math.random() - 0.5) * 2
        }
      })),
      donors: Array.from({ length: 10 }, (_, i) => ({
        id: `donor_${i}`,
        name: `Donor ${i + 1}`,
        verifiedDeliveryRate: Math.random() * 100,
        leaderboardRank: i + 1,
        totalValueEstimated: Math.random() * 1000000
      }))
    };

    return baseData;
  }

  private static generatePreviewHTML(template: Partial<ReportTemplate>, data: Record<string, any>): string {
    // Simple HTML preview generation
    const sections = template.layout?.map(item => {
      switch (item.type) {
        case 'header':
          return `<div class="report-header" style="grid-column: ${item.position.x + 1} / span ${item.position.width}; grid-row: ${item.position.y + 1};">
            <h1>${item.config.title || 'Report Header'}</h1>
            ${item.config.showDate ? `<p>Generated: ${new Date().toLocaleDateString()}</p>` : ''}
          </div>`;
        
        case 'kpi': {
          const assessments = data.assessments || [];
          const responses = data.responses || [];
          const kpiValues = [
            { label: 'Total', value: assessments.length || responses.length || 0 },
            { label: 'Verified', value: assessments.filter((a: any) => a.verificationStatus === 'VERIFIED' || a.verificationStatus === 'AUTO_VERIFIED').length || responses.filter((r: any) => r.deliveryStatus === 'DELIVERED').length || 0 },
          ];
          const kpiHtml = kpiValues.map(kv => `<div class="metric"><span class="value">${kv.value}</span><span class="label">${kv.label}</span></div>`).join('');
          return `<div class="report-kpi" style="grid-column: ${item.position.x + 1} / span ${item.position.width}; grid-row: ${item.position.y + 1};">
            <h3>${item.config.title}</h3>
            <div class="kpi-metrics">${kpiHtml}</div>
          </div>`;
        }
        
        case 'chart':
          return `<div class="report-chart" style="grid-column: ${item.position.x + 1} / span ${item.position.width}; grid-row: ${item.position.y + 1};">
            <h3>${item.config.title}</h3>
            <div class="chart-placeholder">📊 Chart Preview</div>
          </div>`;
        
        case 'table': {
          const columns = item.visualization?.config?.columns || [];
          const tableData = data.assessments || data.responses || data.entities || data.donors || [];
          const pageSize = item.visualization?.config?.pagination?.pageSize || 5;
          const rows = tableData.slice(0, pageSize);
          
          let tableHtml: string;
          if (columns.length > 0 && rows.length > 0) {
            const headerCells = columns.map((col: any) => `<th>${col.header || col.field}</th>`).join('');
            const bodyRows = rows.map((row: any) => {
              const cells = columns.map((col: any) => {
                const fieldAliases: Record<string, string[]> = {
                  status: ['verificationStatus', 'deliveryStatus', 'status'],
                  date: ['rapidAssessmentDate', 'responseDate', 'date'],
                  type: ['rapidAssessmentType', 'type', 'responseType'],
                };
                let val = col.field.split('.').reduce((obj: any, key: string) => obj?.[key], row);
                if (val == null || val === '') {
                  const aliases = fieldAliases[col.field];
                  if (aliases) {
                    for (const alias of aliases) {
                      val = alias.split('.').reduce((obj: any, key: string) => obj?.[key], row);
                      if (val != null && val !== '') break;
                    }
                  }
                }
                if (val instanceof Date) val = val.toISOString().split('T')[0];
                return `<td>${val ?? ''}</td>`;
              }).join('');
              return `<tr>${cells}</tr>`;
            }).join('');
            tableHtml = `<table class="data-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
          } else {
            tableHtml = `<table class="data-table"><thead><tr><th>No data</th></tr></thead><tbody><tr><td>Configure columns and data source</td></tr></tbody></table>`;
          }
          
          return `<div class="report-table" style="grid-column: ${item.position.x + 1} / span ${item.position.width}; grid-row: ${item.position.y + 1};">
            <h3>${item.config.title}</h3>
            ${tableHtml}
          </div>`;
        }
        
        case 'map':
          return `<div class="report-map" style="grid-column: ${item.position.x + 1} / span ${item.position.width}; grid-row: ${item.position.y + 1};">
            <h3>${item.config.title}</h3>
            <div class="map-placeholder">🗺️ Map Preview</div>
          </div>`;
        
        default:
          return `<div class="report-section" style="grid-column: ${item.position.x + 1} / span ${item.position.width}; grid-row: ${item.position.y + 1};">
            <h3>${item.config.title || 'Section'}</h3>
            <p>Section content placeholder</p>
          </div>`;
      }
    }).join('\n');

    return `
      <div class="report-preview" style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; padding: 20px;">
        ${sections}
      </div>
      <style>
        .report-preview { font-family: Arial, sans-serif; }
        .report-header { background: #f8f9fa; padding: 16px; border-radius: 8px; }
        .report-kpi { background: #e3f2fd; padding: 16px; border-radius: 8px; }
        .report-chart { background: #fff3e0; padding: 16px; border-radius: 8px; }
        .report-table { background: #f3e5f5; padding: 16px; border-radius: 8px; }
        .report-map { background: #e8f5e8; padding: 16px; border-radius: 8px; }
        .kpi-metrics { display: flex; gap: 20px; margin-top: 10px; }
        .metric { text-align: center; }
        .metric .value { display: block; font-size: 24px; font-weight: bold; }
        .metric .label { display: block; font-size: 12px; color: #666; }
        .chart-placeholder, .map-placeholder { 
          background: #ddd; 
          height: 200px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 48px;
          border-radius: 4px;
        }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .data-table th { background: #f5f5f5; }
      </style>
    `;
  }
}