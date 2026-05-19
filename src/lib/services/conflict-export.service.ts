import { ConflictApiResponse, ConflictExportOptions } from '@/types/conflict';
import { apiGet } from '@/lib/api'
import { createAuthenticatedFetch } from '@/lib/auth/token-utils'

export interface ExportProgress {
  total: number;
  completed: number;
  percentage: number;
  stage: 'fetching' | 'processing' | 'generating' | 'complete';
}

export class ConflictExportService {
  private static instance: ConflictExportService;

  static getInstance(): ConflictExportService {
    if (!ConflictExportService.instance) {
      ConflictExportService.instance = new ConflictExportService();
    }
    return ConflictExportService.instance;
  }

  async exportConflicts(
    options: ConflictExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    try {
      // Report initial progress
      onProgress?.({
        total: 100,
        completed: 0,
        percentage: 0,
        stage: 'fetching'
      });

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (options.entityType) queryParams.set('entityType', options.entityType);
      if (options.resolved !== undefined) queryParams.set('resolved', options.resolved.toString());
      if (options.dateFrom) queryParams.set('dateFrom', options.dateFrom);
      if (options.dateTo) queryParams.set('dateTo', options.dateTo);

      // Report fetching progress
      onProgress?.({
        total: 100,
        completed: 25,
        percentage: 25,
        stage: 'fetching'
      });

      // Fetch data from export endpoint
      const response = await createAuthenticatedFetch(`/api/v1/sync/conflicts/export?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }

      // Report processing progress
      onProgress?.({
        total: 100,
        completed: 50,
        percentage: 50,
        stage: 'processing'
      });

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = this.extractFilename(contentDisposition) || this.generateFilename(options);

      // Report generating progress
      onProgress?.({
        total: 100,
        completed: 75,
        percentage: 75,
        stage: 'generating'
      });

      // Download the file
      const blob = await response.blob();
      await this.downloadBlob(blob, filename);

      // Report completion
      onProgress?.({
        total: 100,
        completed: 100,
        percentage: 100,
        stage: 'complete'
      });

    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  async exportConflictsToCSV(
    conflicts: ConflictApiResponse[],
    filename?: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    try {
      onProgress?.({
        total: conflicts.length,
        completed: 0,
        percentage: 0,
        stage: 'processing'
      });

      // CSV headers
      const headers = [
        'Conflict ID',
        'Entity Type',
        'Entity ID',
        'Conflict Date',
        'Resolution Method',
        'Local Version',
        'Server Version',
        'Resolved',
        'Resolved At',
        'Resolved By',
        'Auto Resolved',
        'Conflict Reason',
        'Local Last Modified',
        'Server Last Modified'
      ];

      // Process conflicts in batches to show progress
      const batchSize = 100;
      const rows: string[][] = [headers];
      
      for (let i = 0; i < conflicts.length; i += batchSize) {
        const batch = conflicts.slice(i, i + batchSize);
        
        batch.forEach(conflict => {
          rows.push([
            conflict.id,
            conflict.entityType,
            conflict.entityId,
            conflict.conflictDate.toISOString(),
            conflict.resolutionMethod,
            conflict.localVersion.toString(),
            conflict.serverVersion.toString(),
            conflict.isResolved ? 'Yes' : 'No',
            conflict.resolvedAt ? conflict.resolvedAt.toISOString() : '',
            conflict.resolvedBy || '',
            conflict.metadata?.autoResolved ? 'Yes' : 'No',
            conflict.metadata?.conflictReason || '',
            conflict.metadata?.localLastModified?.toISOString() || '',
            conflict.metadata?.serverLastModified?.toISOString() || ''
          ]);
        });

        // Report progress
        const completed = Math.min(i + batchSize, conflicts.length);
        onProgress?.({
          total: conflicts.length,
          completed,
          percentage: Math.round((completed / conflicts.length) * 100),
          stage: 'processing'
        });

        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      onProgress?.({
        total: conflicts.length,
        completed: conflicts.length,
        percentage: 90,
        stage: 'generating'
      });

      // Generate CSV content
      const csvContent = this.arrayToCSV(rows);
      
      // Create and download blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const exportFilename = filename || this.generateFilename();
      
      await this.downloadBlob(blob, exportFilename);

      onProgress?.({
        total: conflicts.length,
        completed: conflicts.length,
        percentage: 100,
        stage: 'complete'
      });

    } catch (error) {
      console.error('CSV export failed:', error);
      throw error;
    }
  }

  private extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch) {
      return filenameMatch[1].replace(/['"]/g, '');
    }
    
    return null;
  }

  private generateFilename(options?: ConflictExportOptions): string {
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = `conflict-report-${timestamp}`;
    
    if (options?.entityType) {
      filename += `-${options.entityType}`;
    }
    
    if (options?.resolved !== undefined) {
      filename += options.resolved ? '-resolved' : '-unresolved';
    }
    
    if (options?.dateFrom && options?.dateTo) {
      filename += `-${options.dateFrom}-to-${options.dateTo}`;
    } else if (options?.dateFrom) {
      filename += `-from-${options.dateFrom}`;
    } else if (options?.dateTo) {
      filename += `-until-${options.dateTo}`;
    }
    
    return `${filename}.csv`;
  }

  private arrayToCSV(data: string[][]): string {
    return data.map(row => 
      row.map(field => {
        // Escape fields containing commas, quotes, or newlines
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      }).join(',')
    ).join('\n');
  }

  private async downloadBlob(blob: Blob, filename: string): Promise<void> {
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  validateExportOptions(options: ConflictExportOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate date range
    if (options.dateFrom && options.dateTo) {
      const fromDate = new Date(options.dateFrom);
      const toDate = new Date(options.dateTo);
      
      if (fromDate > toDate) {
        errors.push('Start date must be before end date');
      }
      
      if (fromDate > new Date()) {
        errors.push('Start date cannot be in the future');
      }
    }

    // Validate entity type
    if (options.entityType && !['assessment', 'response', 'entity'].includes(options.entityType)) {
      errors.push('Invalid entity type');
    }

    // Validate format
    if (options.format && options.format !== 'csv') {
      errors.push('Only CSV format is currently supported');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async getExportPreview(options: ConflictExportOptions): Promise<{
    estimatedCount: number;
    estimatedSize: string;
    dateRange: { from: Date | null; to: Date | null };
  }> {
    try {
      // Fetch summary to estimate export size
      const queryParams = new URLSearchParams();
      if (options.entityType) queryParams.set('entityType', options.entityType);
      if (options.resolved !== undefined) queryParams.set('resolved', options.resolved.toString());
      if (options.dateFrom) queryParams.set('dateFrom', options.dateFrom);
      if (options.dateTo) queryParams.set('dateTo', options.dateTo);
      queryParams.set('limit', '1'); // Just get count

      const result = await apiGet(`/api/v1/sync/conflicts?${queryParams.toString()}`);
      const data = result.data as any;

      const estimatedCount = data.pagination?.total || 0;
      const estimatedSizeKB = Math.ceil(estimatedCount * 0.5); // Rough estimate: 0.5KB per conflict
      const estimatedSize = estimatedSizeKB > 1024 ? 
        `${Math.round(estimatedSizeKB / 1024 * 10) / 10} MB` : 
        `${estimatedSizeKB} KB`;

      return {
        estimatedCount,
        estimatedSize,
        dateRange: {
          from: options.dateFrom ? new Date(options.dateFrom) : null,
          to: options.dateTo ? new Date(options.dateTo) : null
        }
      };
    } catch (error) {
      console.error('Failed to get export preview:', error);
      return {
        estimatedCount: 0,
        estimatedSize: '0 KB',
        dateRange: { from: null, to: null }
      };
    }
  }
}

// Export singleton instance
export const conflictExportService = ConflictExportService.getInstance();