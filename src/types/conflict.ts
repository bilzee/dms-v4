export interface ConflictApiResponse {
  id: string;
  entityType: 'ASSESSMENT' | 'RESPONSE' | 'ENTITY';
  entityId: string;
  conflictDate: Date;
  resolutionMethod: 'LAST_WRITE_WINS' | 'MANUAL' | 'MERGE';
  winningVersion: any;
  losingVersion: any;
  resolvedAt?: Date;
  isResolved: boolean;
  resolvedBy?: string;
  localVersion: number;
  serverVersion: number;
  metadata?: {
    localLastModified: Date;
    serverLastModified: Date;
    conflictReason: string;
    autoResolved: boolean;
  };
}

export interface ConflictSummary {
  totalConflicts: number;
  unresolvedConflicts: number;
  autoResolvedConflicts: number;
  manuallyResolvedConflicts: number;
  resolutionRate: number;
  conflictsByType: {
    assessment: number;
    response: number;
    entity: number;
  };
  recentConflicts: Array<{
    id: string;
    entityType: string;
    entityId: string;
    conflictDate: Date;
    isResolved: boolean;
    resolutionMethod: string;
    autoResolved: boolean;
  }>;
  lastUpdated: string;
}

export interface PaginatedConflictResponse {
  success?: true;
  data: ConflictApiResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ConflictFilters {
  page?: number;
  limit?: number;
  entityType?: 'assessment' | 'response' | 'entity';
  resolved?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface ConflictDisplayGroup {
  entityId: string;
  entityType: string;
  entityName?: string;
  location?: string;
  conflicts: ConflictApiResponse[];
  totalConflicts: number;
  unresolvedCount: number;
  lastConflictDate: Date;
}

export interface ConflictExportOptions {
  entityType?: 'assessment' | 'response' | 'entity';
  resolved?: boolean;
  dateFrom?: string;
  dateTo?: string;
  format: 'csv';
}