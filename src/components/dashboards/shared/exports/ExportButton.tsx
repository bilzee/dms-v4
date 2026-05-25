'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  FileSpreadsheet, 
  Image, 
  FileText, 
  Calendar,
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock
} from '@/lib/icons';
import { useExportStore } from '@/stores/export.store';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  /** Type of data to export */
  dataType: string;
  /** Display label for the button */
  label?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  /** Button size */
  size?: 'default' | 'sm' | 'lg';
  /** Available export formats */
  availableFormats?: ('csv' | 'xlsx' | 'png' | 'svg' | 'pdf')[];
  /** Additional CSS classes */
  className?: string;
  /** Disable button */
  disabled?: boolean;
  /** Click handler override */
  onClick?: () => void;
  /** Show loading state */
  loading?: boolean;
  /** Show export status */
  showStatus?: boolean;
  /** Custom icon */
  icon?: React.ReactNode;
}

const ExportButton = ({
  dataType,
  label = 'Export',
  variant = 'outline',
  size = 'default',
  availableFormats = ['csv', 'xlsx', 'png', 'svg', 'pdf'],
  className,
  disabled = false,
  onClick,
  loading = false,
  showStatus = true,
  icon
}: ExportButtonProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { getExportStatus, startExport } = useExportStore();

  const exportStatus = getExportStatus(dataType);
  const isExporting = exportStatus?.status === 'processing' || loading;

  const handleExport = async (format: "png" | "svg" | "pdf" | "csv" | "xlsx") => {
    try {
      await startExport({
        dataType,
        format,
        dateRange: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          endDate: new Date().toISOString(),
        },
      });
      setShowDropdown(false);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
      case 'xlsx':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'png':
      case 'svg':
        return <Image className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'csv':
        return 'CSV (Excel)';
      case 'xlsx':
        return 'Excel (.xlsx)';
      case 'png':
        return 'PNG Image';
      case 'svg':
        return 'SVG Vector';
      case 'pdf':
        return 'PDF Report';
      default:
        return format.toUpperCase();
    }
  };

  const getStatusIcon = () => {
    if (isExporting) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    } else if (exportStatus?.status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (exportStatus?.status === 'error') {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    } else if (exportStatus?.scheduledFor) {
      return <Clock className="h-4 w-4 text-blue-600" />;
    }
    return icon || <Download className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    if (exportStatus?.status === 'processing') {
      return 'Generating export...';
    } else if (exportStatus?.status === 'completed') {
      return 'Export completed';
    } else if (exportStatus?.status === 'error') {
      return 'Export failed';
    } else if (exportStatus?.scheduledFor) {
      return `Scheduled for ${new Date(exportStatus.scheduledFor).toLocaleDateString()}`;
    }
    return null;
  };

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        className={cn(
          'gap-2 transition-all duration-200',
          isExporting && 'opacity-75 cursor-wait',
          className
        )}
        disabled={disabled || isExporting}
        onClick={onClick || (() => setShowDropdown(!showDropdown))}
      >
        {getStatusIcon()}
        <span>{label}</span>
        {showStatus && exportStatus && (
          <div className={cn(
            'ml-2 px-2 py-1 rounded-full text-xs font-medium',
            exportStatus.status === 'processing' && 'bg-blue-100 text-blue-800',
            exportStatus.status === 'completed' && 'bg-green-100 text-green-800',
            exportStatus.status === 'error' && 'bg-red-100 text-red-800',
            exportStatus.scheduledFor && 'bg-blue-100 text-blue-800'
          )}>
            {exportStatus.status === 'processing' && 'Processing...'}
            {exportStatus.status === 'completed' && 'Ready'}
            {exportStatus.status === 'error' && 'Error'}
            {exportStatus.scheduledFor && 'Scheduled'}
          </div>
        )}
      </Button>

      {/* Export Format Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Download className="h-4 w-4" />
              Export {dataType} as
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {availableFormats.map((format) => (
              <button
                key={format}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted transition-colors',
                  exportStatus?.format === format && exportStatus.status === 'processing' && 'bg-blue-50 text-blue-700'
                )}
                onClick={() => handleExport(format)}
                disabled={isExporting}
              >
                {getFormatIcon(format)}
                <span className="flex-1">{getFormatLabel(format)}</span>
                {exportStatus?.format === format && exportStatus.status === 'processing' && (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                )}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-border">
            <button
              className="w-full flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                setShowDropdown(false);
                // Open advanced export modal
                useExportStore.getState().openExportModal({ dataType });
              }}
            >
              <Settings className="h-3 w-3" />
              Advanced Options
            </button>
          </div>
        </div>
      )}

      {/* Status Message */}
      {showStatus && getStatusMessage() && (
        <div className={cn(
          'absolute top-full left-0 mt-1 px-2 py-1 text-xs rounded whitespace-nowrap z-50',
          exportStatus?.status === 'completed' && 'bg-green-100 text-green-800 border border-green-200',
          exportStatus?.status === 'error' && 'bg-red-100 text-red-800 border border-red-200',
          exportStatus?.status === 'processing' && 'bg-blue-100 text-blue-800 border border-blue-200'
        )}>
          {getStatusMessage()}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default ExportButton;