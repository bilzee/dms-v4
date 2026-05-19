/**
 * Report Management Dashboard
 * Lists, manages, and monitors report configurations and executions
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Clock, 
  Users, 
  Settings, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Square, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  RefreshCw,
  Filter,
  MoreHorizontal,
  Copy,
  Share,
  DownloadCloud
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportExecutionStatus } from '@prisma/client';
import {
  useReportConfigurations,
  useReportExecutions,
  useReportStatistics,
  useDeleteConfiguration,
  useDeleteExecution,
  useDuplicateConfiguration,
} from '@/hooks/useReportManagement'
import { createAuthenticatedFetch } from '@/lib/auth/token-utils'

// Local enum for format types until Prisma schema is updated
enum FormatType {
  PDF = 'pdf',
  CSV = 'csv', 
  EXCEL = 'excel',
  JSON = 'json'
}

interface ReportManagementProps {
  className?: string;
}

// Status colors
const getStatusColor = (status: ReportExecutionStatus): string => {
  switch (status) {
    case ReportExecutionStatus.PENDING:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case ReportExecutionStatus.RUNNING:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case ReportExecutionStatus.COMPLETED:
      return 'bg-green-100 text-green-800 border-green-200';
    case ReportExecutionStatus.FAILED:
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: ReportExecutionStatus) => {
  switch (status) {
    case ReportExecutionStatus.PENDING:
      return <Clock className="h-4 w-4" />;
    case ReportExecutionStatus.RUNNING:
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    case ReportExecutionStatus.COMPLETED:
      return <CheckCircle2 className="h-4 w-4" />;
    case ReportExecutionStatus.FAILED:
      return <XCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

export function ReportManagement({ className }: ReportManagementProps) {
  const queryClient = useQueryClient();
  
  // State management
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState({ days: 30 });
  const [activeTab, setActiveTab] = useState('configurations');

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch configurations
  const configParams: Record<string, string> = {
    search: debouncedSearch,
    timeRange: timeRange.days.toString()
  };
  if (statusFilter !== 'all') configParams.status = statusFilter;

  const { data: configurations, isLoading: configsLoading, error: configsError } = useReportConfigurations(configParams);

  // Fetch executions
  const executionParams: Record<string, string> = {
    search: debouncedSearch,
    timeRange: timeRange.days.toString()
  };
  if (statusFilter !== 'all') executionParams.status = statusFilter;
  if (formatFilter !== 'all') executionParams.format = formatFilter;

  const { data: executions, isLoading: executionsLoading, error: executionsError } = useReportExecutions(executionParams);

  // Get statistics
  const { data: statistics, isLoading: statsLoading } = useReportStatistics({ timeRange: timeRange.days.toString() });

  // Mutations
  const deleteConfigurationMutation = useDeleteConfiguration();
  const deleteExecutionMutation = useDeleteExecution();
  const duplicateConfigurationMutation = useDuplicateConfiguration();

  // Refresh data
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['report-configurations'] });
    queryClient.invalidateQueries({ queryKey: ['report-executions'] });
    queryClient.invalidateQueries({ queryKey: ['report-statistics'] });
  }, [queryClient]);

  // Download report
  const downloadReport = useCallback(async (executionId: string, format: FormatType) => {
    try {
      const response = await createAuthenticatedFetch(`/api/v1/reports/download/${executionId}`, {
        headers: {
          'Accept': format === FormatType.PDF ? 'application/pdf' : 
                  format === FormatType.CSV ? 'text/csv' : 
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });
      
      if (!response.ok) throw new Error('Failed to download report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, []);

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Get status description
  const getStatusDescription = (status: ReportExecutionStatus): string => {
    switch (status) {
      case ReportExecutionStatus.PENDING:
        return 'Queued for generation';
      case ReportExecutionStatus.RUNNING:
        return 'Currently generating';
      case ReportExecutionStatus.COMPLETED:
        return 'Generation completed';
      case ReportExecutionStatus.FAILED:
        return 'Generation failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Report Management</h2>
          <p className="text-gray-600">
            Manage your report configurations and view generation history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalConfigurations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active report configurations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions This Period</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.executionsInPeriod || 0}</div>
            <p className="text-xs text-muted-foreground">
              In the last {timeRange.days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.successRate ? `${statistics.successRate.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Reports generated successfully
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <DownloadCloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalDownloads || 0}</div>
            <p className="text-xs text-muted-foreground">
              Reports downloaded by users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search configurations or reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Format Filter */}
            <div className="space-y-2">
              <Label htmlFor="format-filter">Format</Label>
              <Select
                value={formatFilter}
                onValueChange={setFormatFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All formats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="HTML">HTML</SelectItem>
                  <SelectItem value="EXCEL">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range */}
            <div className="space-y-2">
              <Label htmlFor="time-range">Time Range</Label>
              <Select
                value={timeRange.days.toString()}
                onValueChange={(value) => setTimeRange({ days: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
        </TabsList>

        {/* Configurations Tab */}
        <TabsContent value="configurations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Report Configurations</h3>
            <Button onClick={() => window.location.href = '/reports/builder'}>
              <FileText className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </div>

          {configsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading configurations...</p>
              </div>
            </div>
          ) : configsError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">Failed to load configurations</p>
              </div>
            </div>
          ) : configurations?.items?.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No configurations found</h3>
                <p className="text-gray-600 mb-4">
                  Create your first report configuration to get started
                </p>
                <Button onClick={() => window.location.href = '/reports/builder'}>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Configuration
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {configurations.items.map((config: any) => (
                  <Card key={config.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        {/* Configuration Header */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="text-lg font-semibold">{config.name}</h4>
                            {config.template?.name && (
                              <p className="text-sm text-gray-600">
                                Template: {config.template.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={config.isPublic ? "default" : "secondary"}>
                              {config.isPublic ? 'Public' : 'Private'}
                            </Badge>
                            <Badge variant="outline">
                              {config.template?.type}
                            </Badge>
                          </div>
                        </div>

                        {/* Configuration Description */}
                        {config.description && (
                          <p className="text-sm text-gray-700 mb-3">
                            {config.description}
                          </p>
                        )}

                        {/* Latest Execution Status */}
                        {config.latestExecution && (
                          <div className={cn(
                            "p-3 rounded-lg border",
                            getStatusColor(config.latestExecution.status)
                          )}>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(config.latestExecution.status)}
                              <span className="font-medium">
                                {getStatusDescription(config.latestExecution.status)}
                              </span>
                            </div>
                            <div className="text-sm mt-2 space-y-1">
                              <p>Last run: {new Date(config.latestExecution.createdAt).toLocaleString()}</p>
                              {config.latestExecution.generatedAt && (
                                <p>Generated: {new Date(config.latestExecution.generatedAt).toLocaleString()}</p>
                              )}
                              {config.latestExecution.error && (
                                <p className="text-red-700">Error: {config.latestExecution.error}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Schedule Information */}
                        {config.schedule?.enabled && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-800">Scheduled Report</span>
                            </div>
                            <div className="text-sm text-blue-700">
                              <p>Frequency: {config.schedule.frequency}</p>
                              {config.schedule.startDate && (
                                <p>Next run: {new Date(config.schedule.startDate).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/reports/builder?id=${config.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateConfigurationMutation.mutate(config.id)}
                          disabled={duplicateConfigurationMutation.isPending}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Duplicate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (config.latestExecution?.status === 'COMPLETED') {
                              downloadReport(config.latestExecution.id, config.latestExecution.format as FormatType);
                            }
                          }}
                          disabled={config.latestExecution?.status !== 'COMPLETED'}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteConfigurationMutation.mutate(config.id)}
                          disabled={deleteConfigurationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Report Executions</h3>
            <div className="text-sm text-gray-600">
              Showing {executions?.items?.length || 0} executions
            </div>
          </div>

          {executionsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading executions...</p>
              </div>
            </div>
          ) : executionsError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">Failed to load executions</p>
              </div>
            </div>
          ) : executions?.items?.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No executions found</h3>
                <p className="text-gray-600 mb-4">
                  No report executions match your current filters
                </p>
                <Button onClick={() => setActiveTab('configurations')}>
                  View Configurations
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {executions.items.map((execution: any) => (
                  <Card key={execution.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        {/* Execution Header */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="text-lg font-semibold">
                              {execution.configuration?.template?.name || 'Report'} - {execution.format}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Created: {new Date(execution.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-sm font-medium",
                            getStatusColor(execution.status)
                          )}>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(execution.status)}
                              <span>{getStatusDescription(execution.status)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress for running executions */}
                        {execution.status === ReportExecutionStatus.RUNNING && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-blue-800">In Progress</span>
                              <span className="text-sm text-blue-600">
                                {execution.progress?.percent || 0}% complete
                              </span>
                            </div>
                            <Progress 
                              value={execution.progress?.percent || 0} 
                              className="w-full" 
                            />
                            {execution.progress?.message && (
                              <p className="text-sm text-blue-700 mt-2">
                                {execution.progress.message}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Completion Information */}
                        {execution.status === ReportExecutionStatus.COMPLETED && (
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-green-800">Generated:</span>
                                <p className="text-green-700">
                                  {new Date(execution.generatedAt!).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-green-800">File Size:</span>
                                <p className="text-green-700">
                                  {formatFileSize(execution.fileSize)}
                                </p>
                              </div>
                              <div className="col-span-2">
                                <span className="font-medium text-green-800">Format:</span>
                                <p className="text-green-700">
                                  {execution.format}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Error Information */}
                        {execution.status === ReportExecutionStatus.FAILED && (
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="font-medium text-red-800">Failed</span>
                              </div>
                              <p className="text-sm text-red-700">
                                {execution.error || 'Unknown error occurred'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-4">
                        {execution.status === ReportExecutionStatus.COMPLETED && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReport(execution.id, execution.format)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                        {execution.status === ReportExecutionStatus.RUNNING && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteExecutionMutation.mutate(execution.id)}
                            disabled={deleteExecutionMutation.isPending}
                          >
                            <Square className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                        {(execution.status === ReportExecutionStatus.COMPLETED || execution.status === ReportExecutionStatus.FAILED) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteExecutionMutation.mutate(execution.id)}
                            disabled={deleteExecutionMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}