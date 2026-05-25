'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConflictExportOptions } from '@/types/conflict';
import { conflictExportService, ExportProgress } from '@/lib/services/conflict-export.service';

interface ConflictExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters?: Partial<ConflictExportOptions>;
}

export const ConflictExportDialog = ({ 
  isOpen, 
  onClose, 
  initialFilters = {} 
}: ConflictExportDialogProps) => {
  const [options, setOptions] = useState<ConflictExportOptions>({
    format: 'csv',
    ...initialFilters
  });
  const [preview, setPreview] = useState<{
    estimatedCount: number;
    estimatedSize: string;
    dateRange: { from: Date | null; to: Date | null };
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    try {
      const previewData = await conflictExportService.getExportPreview(options);
      setPreview(previewData);
    } catch (err) {
      console.error('Failed to load export preview:', err);
    }
  }, [options]);

  useEffect(() => {
    if (isOpen) {
      loadPreview();
    }
  }, [isOpen, options, loadPreview]);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setExportProgress(null);

    try {
      // Validate options
      const validation = conflictExportService.validateExportOptions(options);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      // Start export with progress tracking
      await conflictExportService.exportConflicts(options, (progress) => {
        setExportProgress(progress);
      });

      // Close dialog on success
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFieldChange = (field: keyof ConflictExportOptions, value: any) => {
    setOptions(prev => ({ ...prev, [field]: value }));
  };

  const getProgressStageText = (stage: ExportProgress['stage']) => {
    switch (stage) {
      case 'fetching': return 'Fetching conflict data...';
      case 'processing': return 'Processing conflicts...';
      case 'generating': return 'Generating export file...';
      case 'complete': return 'Export complete!';
      default: return 'Preparing export...';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Export Conflicts</h3>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Entity Type Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Entity Type
            </label>
            <select
              value={options.entityType || ''}
              onChange={(e) => handleFieldChange('entityType', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="assessment">Assessment</option>
              <option value="response">Response</option>
              <option value="entity">Entity</option>
            </select>
          </div>

          {/* Resolution Status Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Resolution Status
            </label>
            <select
              value={options.resolved === undefined ? '' : options.resolved.toString()}
              onChange={(e) => handleFieldChange('resolved', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="true">Resolved Only</option>
              <option value="false">Unresolved Only</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                From Date
              </label>
              <input
                type="date"
                value={options.dateFrom || ''}
                onChange={(e) => handleFieldChange('dateFrom', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                To Date
              </label>
              <input
                type="date"
                value={options.dateTo || ''}
                onChange={(e) => handleFieldChange('dateTo', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Format
            </label>
            <select
              value={options.format}
              onChange={(e) => handleFieldChange('format', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="csv">CSV</option>
            </select>
          </div>

          {/* Preview Information */}
          {preview && (
            <div className="bg-muted rounded-lg p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Export Preview</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Estimated records: <span className="font-medium">{preview.estimatedCount.toLocaleString()}</span></p>
                <p>Estimated size: <span className="font-medium">{preview.estimatedSize}</span></p>
                {preview.dateRange.from && preview.dateRange.to && (
                  <p>Date range: {preview.dateRange.from.toLocaleDateString()} - {preview.dateRange.to.toLocaleDateString()}</p>
                )}
              </div>
            </div>
          )}

          {/* Export Progress */}
          {isExporting && exportProgress && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  {getProgressStageText(exportProgress.stage)}
                </span>
                <span className="text-sm text-blue-700">
                  {exportProgress.percentage}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-sm font-medium text-red-800">Export Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}
        </div>

        {/* Dialog Actions */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-gray-200 rounded-md disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !preview || preview.estimatedCount === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};