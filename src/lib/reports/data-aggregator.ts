/**
 * Data Source Aggregation and Filtering
 * Handles data aggregation for report generation
 */

import { z } from 'zod';
import { db } from '@/lib/db/client';

// Supported aggregation functions
export enum AggregationFunction {
  SUM = 'sum',
  COUNT = 'count',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  PERCENTAGE = 'percentage',
  DISTINCT_COUNT = 'distinct_count'
}

// Data source types
export enum DataSourceType {
  ASSESSMENTS = 'assessments',
  RESPONSES = 'responses',
  ENTITIES = 'entities',
  DONORS = 'donors',
  COMMITMENTS = 'donor_commitments',
  INCIDENTS = 'incidents',
  PRELIMINARY_ASSESSMENTS = 'preliminary_assessments'
}

// Field mappings for data sources
export const DATA_SOURCE_FIELDS = {
  [DataSourceType.ASSESSMENTS]: {
    id: 'id',
    rapidAssessmentType: 'rapidAssessmentType',
    rapidAssessmentDate: 'rapidAssessmentDate',
    assessorId: 'assessorId',
    entityId: 'entityId',
    incidentId: 'incidentId',
    status: 'status',
    priority: 'priority',
    verificationStatus: 'verificationStatus',
    createdAt: 'createdAt',
    'entity.name': 'entity.name',
    'entity.type': 'entity.type',
    'entity.location': 'entity.location',
    'incident.type': 'incident.type',
    'incident.severity': 'incident.severity',
    'assessor.name': 'assessor.name'
  },
  [DataSourceType.RESPONSES]: {
    id: 'id',
    responderId: 'responderId',
    assessmentId: 'assessmentId',
    entityId: 'entityId',
    type: 'type',
    status: 'status',
    priority: 'priority',
    deliveredQuantity: 'deliveredQuantity',
    responseDate: 'responseDate',
    createdAt: 'createdAt',
    'entity.name': 'entity.name',
    'type.name': 'type'
  },
  [DataSourceType.ENTITIES]: {
    id: 'id',
    name: 'name',
    type: 'type',
    location: 'location',
    coordinates: 'coordinates',
    isActive: 'isActive',
    autoApproveEnabled: 'autoApproveEnabled',
    createdAt: 'createdAt'
  },
  [DataSourceType.DONORS]: {
    id: 'id',
    name: 'name',
    type: 'type',
    contactEmail: 'contactEmail',
    contactPhone: 'contactPhone',
    organization: 'organization',
    isActive: 'isActive',
    selfReportedDeliveryRate: 'selfReportedDeliveryRate',
    verifiedDeliveryRate: 'verifiedDeliveryRate',
    leaderboardRank: 'leaderboardRank',
    createdAt: 'createdAt'
  },
  [DataSourceType.COMMITMENTS]: {
    id: 'id',
    donorId: 'donorId',
    entityId: 'entityId',
    incidentId: 'incidentId',
    status: 'status',
    items: 'items',
    totalCommittedQuantity: 'totalCommittedQuantity',
    deliveredQuantity: 'deliveredQuantity',
    verifiedDeliveredQuantity: 'verifiedDeliveredQuantity',
    totalValueEstimated: 'totalValueEstimated',
    commitmentDate: 'commitmentDate',
    createdAt: 'createdAt',
    'donor.name': 'donor.name',
    'entity.name': 'entity.name',
    'incident.type': 'incident.type'
  },
  [DataSourceType.INCIDENTS]: {
    id: 'id',
    type: 'type',
    subType: 'subType',
    severity: 'severity',
    status: 'status',
    description: 'description',
    location: 'location',
    coordinates: 'coordinates',
    createdBy: 'createdBy',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  [DataSourceType.PRELIMINARY_ASSESSMENTS]: {
    id: 'id',
    reportingDate: 'reportingDate',
    reportingLatitude: 'reportingLatitude',
    reportingLongitude: 'reportingLongitude',
    reportingLGA: 'reportingLGA',
    reportingWard: 'reportingWard',
    numberLivesLost: 'numberLivesLost',
    numberInjured: 'numberInjured',
    numberDisplaced: 'numberDisplaced',
    numberHousesAffected: 'numberHousesAffected',
    numberSchoolsAffected: 'numberSchoolsAffected',
    numberMedicalFacilitiesAffected: 'numberMedicalFacilitiesAffected',
    reportingAgent: 'reportingAgent',
    incidentId: 'incidentId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
} as const;

// Aggregation configuration schema
export const AggregationConfigSchema = z.object({
  id: z.string(),
  field: z.string(),
  function: z.nativeEnum(AggregationFunction),
  groupBy: z.array(z.string()).optional(),
  filter: z.record(z.any()).optional(),
  alias: z.string().optional(),
  format: z.enum(['number', 'percentage', 'currency', 'date']).optional()
});

export type AggregationConfig = z.infer<typeof AggregationConfigSchema>;

// Filter configuration schema
export const FilterConfigSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'startsWith', 'endsWith']),
  value: z.any(),
  logicalOperator: z.enum(['and', 'or']).default('and')
});

export type FilterConfig = z.infer<typeof FilterConfigSchema>;

// Combined filter schema
export const ReportFiltersSchema = z.object({
  dateRange: z.object({
    field: z.string().default('createdAt'),
    startDate: z.string(),
    endDate: z.string()
  }).optional(),
  filters: z.array(FilterConfigSchema).default([]),
  aggregations: z.array(AggregationConfigSchema).default([]),
  search: z.string().optional(),
  orderBy: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']).default('desc')
  }).optional(),
  limit: z.number().positive().max(10000).optional().default(1000)
});

export type ReportFilters = z.infer<typeof ReportFiltersSchema>;

/**
 * Main data aggregation class
 */
export class DataAggregator {
  static async executeQuery(
    dataSource: DataSourceType,
    filters: ReportFilters,
    options: { includeCount?: boolean; includeAggregations?: boolean } = {}
  ) {
    const { includeCount = false, includeAggregations = true } = options;

    // Build Prisma query based on data source
    let query: any = {
      where: this.buildWhereClause(dataSource, filters),
      orderBy: this.buildOrderByClause(filters.orderBy),
      take: filters.limit
    };

    // Add includes for related data
    query = this.addIncludes(query, dataSource);

    // Add select based on what we need
    if (includeAggregations) {
      query.select = this.buildSelectClause(dataSource, filters.aggregations);
    }

    // Execute the query
    const data = await this.executeQueryByDataSource(dataSource, query);

    // Process aggregations if needed
    let result = data;
    if (includeAggregations && filters.aggregations.length > 0) {
      result = this.processAggregations(data, filters.aggregations);
    }

    // Get total count if requested
    let totalCount = undefined;
    if (includeCount) {
      totalCount = await this.getRecordCount(dataSource, filters);
    }

    return {
      data: result,
      totalCount,
      metadata: {
        dataSource,
        query: filters,
        executionTime: Date.now()
      }
    };
  }

  /**
   * Build Prisma where clause from filters
   */
  private static buildWhereClause(dataSource: DataSourceType, filters: ReportFilters): any {
    const where: any = {};

    // Add date range filter
    if (filters.dateRange) {
      where[filters.dateRange.field] = {
        gte: new Date(filters.dateRange.startDate),
        lte: new Date(filters.dateRange.endDate)
      };
    }

    // Add search filter
    if (filters.search) {
      where.OR = [
        ...((where.OR || []) as any[]),
        this.buildSearchConditions(dataSource, filters.search)
      ];
    }

    // Add custom filters
    if (filters.filters && filters.filters.length > 0) {
      const filterGroups = this.groupFiltersByLogicalOperator(filters.filters);
      
      if (filterGroups.and.length > 0) {
        where.AND = [
          ...(where.AND || []),
          ...filterGroups.and.map(filter => this.buildPrismaFilter(filter))
        ];
      }

      if (filterGroups.or.length > 0) {
        where.OR = [
          ...(where.OR || []),
          ...filterGroups.or.map(filter => this.buildPrismaFilter(filter))
        ];
      }
    }

    return where;
  }

  /**
   * Build search conditions based on data source fields
   */
  private static buildSearchConditions(dataSource: DataSourceType, search: string): any[] {
    const fields = Object.values(DATA_SOURCE_FIELDS[dataSource]);
    const searchableFields = fields.filter(field => 
      !field.includes('.') && 
      (field.includes('name') || field.includes('description') || field.includes('type'))
    );

    return searchableFields.map(field => ({
      [field]: {
        contains: search,
        mode: 'insensitive'
      }
    }));
  }

  /**
   * Group filters by logical operator
   */
  private static groupFiltersByLogicalOperator(filters: FilterConfig[]) {
    return filters.reduce((acc, filter) => {
      if (filter.logicalOperator === 'or') {
        acc.or.push(filter);
      } else {
        acc.and.push(filter);
      }
      return acc;
    }, { and: [] as FilterConfig[], or: [] as FilterConfig[] });
  }

  /**
   * Convert filter config to Prisma filter
   */
  private static buildPrismaFilter(filter: FilterConfig): any {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'eq':
        return { [field]: value };
      case 'ne':
        return { [field]: { not: value } };
      case 'gt':
        return { [field]: { gt: value } };
      case 'gte':
        return { [field]: { gte: value } };
      case 'lt':
        return { [field]: { lt: value } };
      case 'lte':
        return { [field]: { lte: value } };
      case 'in':
        return { [field]: { in: Array.isArray(value) ? value : [value] } };
      case 'nin':
        return { [field]: { notIn: Array.isArray(value) ? value : [value] } };
      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };
      case 'startsWith':
        return { [field]: { startsWith: value, mode: 'insensitive' } };
      case 'endsWith':
        return { [field]: { endsWith: value, mode: 'insensitive' } };
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Build order by clause
   */
  private static buildOrderByClause(orderBy?: { field: string; direction: 'asc' | 'desc' }): any {
    if (!orderBy) {
      return [{ createdAt: 'desc' as const }];
    }

    return { [orderBy.field]: orderBy.direction };
  }

  /**
   * Add includes based on data source
   */
  private static addIncludes(query: any, dataSource: DataSourceType): any {
    switch (dataSource) {
      case DataSourceType.ASSESSMENTS:
        query.include = {
          entity: { select: { id: true, name: true, type: true, location: true } },
          incident: { select: { id: true, type: true, severity: true } },
          assessor: { select: { id: true, name: true, email: true } }
        };
        break;
      case DataSourceType.RESPONSES:
        query.include = {
          entity: { select: { id: true, name: true, type: true, location: true } },
          assessment: { select: { id: true, rapidAssessmentType: true } }
        };
        break;
      case DataSourceType.COMMITMENTS:
        query.include = {
          donor: { select: { id: true, name: true, type: true } },
          entity: { select: { id: true, name: true, type: true, location: true } },
          incident: { select: { id: true, type: true, severity: true } }
        };
        break;
      default:
        // No includes for other data sources
        break;
    }

    return query;
  }

  /**
   * Build select clause for aggregations
   */
  private static buildSelectClause(dataSource: DataSourceType, aggregations: AggregationConfig[]): any {
    if (aggregations.length === 0) {
      return undefined; // Return all fields if no aggregations specified
    }

    const fields = new Set<string>();
    const aggregationFields = new Set<string>();

    aggregations.forEach(agg => {
      // Add group by fields
      if (agg.groupBy) {
        agg.groupBy.forEach(field => fields.add(field));
      }
      
      // Add aggregation field for processing
      aggregationFields.add(agg.field);
    });

    // Always return key fields
    fields.add('id');
    fields.add('createdAt');

    const select: any = {};
    fields.forEach(field => {
      select[field] = true;
    });

    return select;
  }

  /**
   * Execute query based on data source
   */
  private static async executeQueryByDataSource(dataSource: DataSourceType, query: any): Promise<any[]> {
    switch (dataSource) {
      case DataSourceType.ASSESSMENTS:
        return await db.rapidAssessment.findMany(query);
      case DataSourceType.RESPONSES:
        return await db.rapidResponse.findMany(query);
      case DataSourceType.ENTITIES:
        return await db.entity.findMany(query);
      case DataSourceType.DONORS:
        return await db.donor.findMany(query);
      case DataSourceType.COMMITMENTS:
        return await db.donorCommitment.findMany(query);
      case DataSourceType.INCIDENTS:
        return await db.incident.findMany(query);
      case DataSourceType.PRELIMINARY_ASSESSMENTS:
        return await db.preliminaryAssessment.findMany(query);
      default:
        throw new Error(`Unsupported data source: ${dataSource}`);
    }
  }

  /**
   * Get record count for pagination
   */
  private static async getRecordCount(dataSource: DataSourceType, filters: ReportFilters): Promise<number> {
    const where = this.buildWhereClause(dataSource, filters);

    switch (dataSource) {
      case DataSourceType.ASSESSMENTS:
        return await db.rapidAssessment.count({ where });
      case DataSourceType.RESPONSES:
        return await db.rapidResponse.count({ where });
      case DataSourceType.ENTITIES:
        return await db.entity.count({ where });
      case DataSourceType.DONORS:
        return await db.donor.count({ where });
      case DataSourceType.COMMITMENTS:
        return await db.donorCommitment.count({ where });
      case DataSourceType.INCIDENTS:
        return await db.incident.count({ where });
      case DataSourceType.PRELIMINARY_ASSESSMENTS:
        return await db.preliminaryAssessment.count({ where });
      default:
        return 0;
    }
  }

  /**
   * Process aggregations on returned data
   */
  private static processAggregations(data: any[], aggregations: AggregationConfig[]): any[] {
    if (aggregations.length === 0) {
      return data;
    }

    // Group data by groupBy fields
    const grouped = this.groupData(data, aggregations);

    // Process each group
    return Object.entries(grouped).map(([groupKey, groupData]) => {
      const groupValues = groupKey.split('|').reduce((acc, value, index) => {
        const firstAgg = aggregations.find(agg => agg.groupBy && agg.groupBy[index]);
        if (firstAgg) {
          acc[firstAgg.groupBy![index]] = value === 'null' ? null : value;
        }
        return acc;
      }, {} as any);

      // Apply aggregations
      aggregations.forEach(agg => {
        const value = this.applyAggregation(groupData, agg);
        groupValues[agg.alias || `${agg.function}_${agg.field}`] = this.formatAggregatedValue(value, agg.format);
      });

      groupValues._count = groupData.length;
      
      return groupValues;
    });
  }

  /**
   * Group data by specified fields
   */
  private static groupData(data: any[], aggregations: AggregationConfig[]): Record<string, any[]> {
    const groupByFields = aggregations
      .filter(agg => agg.groupBy && agg.groupBy.length > 0)
      .flatMap(agg => agg.groupBy || []);

    if (groupByFields.length === 0) {
      return { '': data }; // Single group if no groupBy
    }

    return data.reduce((acc, item) => {
      const groupKey = groupByFields
        .map(field => this.getNestedValue(item, field) || 'null')
        .join('|');
      
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      
      return acc;
    }, {} as Record<string, any[]>);
  }

  /**
   * Get nested value from object
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Apply aggregation function to data
   */
  private static applyAggregation(data: any[], aggregation: AggregationConfig): any {
    const field = aggregation.field;
    const values = data.map(item => this.getNestedValue(item, field)).filter(v => v !== null && v !== undefined);

    switch (aggregation.function) {
      case AggregationFunction.SUM:
        return values.reduce((sum, val) => sum + Number(val || 0), 0);
      case AggregationFunction.COUNT:
        return data.length;
      case AggregationFunction.AVERAGE:
        return values.length > 0 ? values.reduce((sum, val) => sum + Number(val || 0), 0) / values.length : 0;
      case AggregationFunction.MIN:
        return values.length > 0 ? Math.min(...values.map(Number)) : 0;
      case AggregationFunction.MAX:
        return values.length > 0 ? Math.max(...values.map(Number)) : 0;
      case AggregationFunction.PERCENTAGE:
        const total = values.reduce((sum, val) => sum + Number(val || 0), 0);
        return total > 0 ? (Number(values[0] || 0) / total) * 100 : 0;
      case AggregationFunction.DISTINCT_COUNT:
        return new Set(values).size;
      default:
        throw new Error(`Unsupported aggregation function: ${aggregation.function}`);
    }
  }

  /**
   * Format aggregated value
   */
  private static formatAggregatedValue(value: any, format?: string): any {
    if (format === 'number') {
      return Number(value);
    } else if (format === 'percentage') {
      return Number(Number(value).toFixed(2));
    } else if (format === 'currency') {
      return Number(Number(value).toFixed(2));
    } else if (format === 'date') {
      return new Date(value).toISOString();
    }
    
    return value;
  }

  /**
   * Get data preview for real-time configuration
   */
  static async getDataPreview(dataSource: DataSourceType, filters: ReportFilters, limit = 10): Promise<any[]> {
    const previewFilters = { ...filters, limit };
    
    const result = await this.executeQuery(dataSource, previewFilters, {
      includeCount: false,
      includeAggregations: false
    });

    return result.data.slice(0, limit);
  }

  /**
   * Get field suggestions for autocomplete
   */
  static getAvailableFields(dataSource: DataSourceType): Array<{ field: string; type: string; description: string }> {
    const fields = DATA_SOURCE_FIELDS[dataSource];
    
    return Object.entries(fields).map(([field, path]) => ({
      field: path,
      type: this.inferFieldType(path),
      description: this.getFieldDescription(path)
    }));
  }

  /**
   * Infer field type for validation
   */
  private static inferFieldType(fieldPath: string): string {
    if (fieldPath.includes('Date') || fieldPath === 'createdAt' || fieldPath === 'updatedAt') {
      return 'date';
    } else if (fieldPath.includes('Quantity') || fieldPath.includes('Number') || fieldPath.includes('Rate')) {
      return 'number';
    } else if (fieldPath.includes('isActive') || fieldPath.includes('autoApproveEnabled')) {
      return 'boolean';
    } else {
      return 'string';
    }
  }

  /**
   * Get field description for UI
   */
  private static getFieldDescription(fieldPath: string): string {
    const descriptions: Record<string, string> = {
      'rapidAssessmentType': 'Type of assessment conducted',
      'rapidAssessmentDate': 'Date when assessment was performed',
      'status': 'Current status of the record',
      'priority': 'Priority level assigned',
      'deliveredQuantity': 'Total quantity delivered',
      'verifiedDeliveryRate': 'Percentage of verified deliveries',
      'totalValueEstimated': 'Estimated total value of commitment'
    };

    return descriptions[fieldPath] || fieldPath;
  }
}