'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileSpreadsheet, 
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { createAuthenticatedFetch } from '@/lib/auth/token-utils';
import type { ExportRequest } from '@/types/gamification';

interface ExportButtonProps {
  donorIds?: string[];
  format?: 'csv' | 'pdf';
  timeframe?: '7d' | '30d' | '90d' | '1y' | 'all';
  includeCharts?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({
  donorIds,
  format: initialFormat = 'csv',
  timeframe: initialTimeframe = '30d',
  includeCharts: initialIncludeCharts = false,
  disabled = false,
  className
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<'csv' | 'pdf'>(initialFormat);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>(initialTimeframe);
  const [includeCharts, setIncludeCharts] = useState(initialIncludeCharts);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('idle');
    setExportMessage('');

    try {
      const exportRequest: ExportRequest = {
        donorIds,
        format,
        timeframe,
        includeCharts
      };

      const response = await createAuthenticatedFetch('/api/v1/reports/performance/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
      }

      if (format === 'csv') {
        // Handle CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get filename from response headers or generate one
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `donor-performance-report-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setExportStatus('success');
        setExportMessage(`CSV report downloaded successfully as ${filename}`);
      } else {
        // Handle PDF response (structured data for frontend PDF generation)
        const data = await response.json();
        
        if (data.success && data.data) {
          // For now, just show success message
          // In a real implementation, you would generate the PDF client-side
          setExportStatus('success');
          setExportMessage(`PDF report prepared successfully. Download feature coming soon.`);
        } else {
          throw new Error(data.error || 'Failed to prepare PDF report');
        }
      }

      // Close dialog after successful export
      setTimeout(() => {
        setIsOpen(false);
        setExportStatus('idle');
        setExportMessage('');
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
      setExportMessage(error instanceof Error ? error.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const resetForm = () => {
    setFormat(initialFormat);
    setTimeframe(initialTimeframe);
    setIncludeCharts(initialIncludeCharts);
    setExportStatus('idle');
    setExportMessage('');
  };

  const getIcon = () => {
    if (isExporting) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    switch (exportStatus) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return format === 'csv' ? <FileSpreadsheet className="w-4 h-4" /> : <FileText className="w-4 h-4" />;
    }
  };

  const getButtonText = () => {
    if (isExporting) return 'Exporting...';
    if (exportStatus === 'success') return 'Downloaded';
    if (exportStatus === 'error') return 'Failed';
    return `Export ${format.toUpperCase()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (open) {
        resetForm();
      } else {
        setIsOpen(false);
      }
    }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
          disabled={disabled}
        >
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            Export Performance Report
          </DialogTitle>
          <DialogDescription>
            Generate and download donor performance reports in your preferred format.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <Select value={format} onValueChange={(value: 'csv' | 'pdf') => setFormat(value)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV (Spreadsheet)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PDF Report
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeframe Selection */}
          <div className="space-y-2">
            <Label htmlFor="timeframe">Report Period</Label>
            <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
              <SelectTrigger id="timeframe">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCharts"
                checked={includeCharts}
                onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                disabled={format === 'csv'}
              />
              <Label htmlFor="includeCharts" className={cn(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                format === 'csv' && "text-gray-400"
              )}>
                Include charts and graphs
              </Label>
            </div>
            {format === 'csv' && (
              <p className="text-xs text-gray-500">Charts are only available in PDF format</p>
            )}
          </div>

          {/* Export Status Messages */}
          {exportStatus !== 'idle' && (
            <Alert className={cn(
              exportStatus === 'success' && "border-green-200 bg-green-50",
              exportStatus === 'error' && "border-red-200 bg-red-50"
            )}>
              <AlertDescription className={cn(
                exportStatus === 'success' && "text-green-800",
                exportStatus === 'error' && "text-red-800"
              )}>
                {exportMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className={cn(
                "gap-2",
                exportStatus === 'success' && "bg-green-600 hover:bg-green-700",
                exportStatus === 'error' && "bg-red-600 hover:bg-red-700"
              )}
            >
              {getIcon()}
              {getButtonText()}
            </Button>
          </div>

          {/* Additional Information */}
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>CSV Format:</strong> Includes all performance metrics and trend data in spreadsheet format.</p>
            <p><strong>PDF Format:</strong> Generates a formatted report with charts and visualizations.</p>
            <p><strong>Data Security:</strong> Exports are limited to your own performance data unless you have admin permissions.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}