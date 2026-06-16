'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  History, 
  Search, 
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Settings,
  Eye,
  RotateCcw,
  Filter,
  X
} from '@/lib/icons';
import { apiGet, apiPost } from '@/lib/api';
import { createAuthenticatedFetch } from '@/lib/auth/token-utils';
import { cn } from '@/lib/utils';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';
import { format } from 'date-fns';

interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId: string;
  resourceName?: string;
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: {
    bulkUpdate?: boolean;
    entitiesAffected?: number;
    configurationScope?: string;
    reason?: string;
  };
}

interface AuditFilters {
  dateRange: 'today' | 'week' | 'month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  action: string;
  userId: string;
  resource: string;
  search: string;
}

interface ConfigurationAuditHistoryProps {
  className?: string;
  entityId?: string;
  showRollbackOptions?: boolean;
}

// API functions
async function fetchAuditHistory(filters: AuditFilters, entityId?: string): Promise<{
  data: AuditLogEntry[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  summary: {
    totalEntries: number;
    uniqueUsers: number;
    configurationChanges: number;
    bulkOperations: number;
  };
}> {
  const params = new URLSearchParams();
  const now = new Date();
  let startDate: string;

  switch (filters.dateRange) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case 'custom':
      if (filters.customStartDate) {
        startDate = new Date(filters.customStartDate).toISOString();
      } else {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  params.append('startDate', startDate);

  if (filters.dateRange === 'custom' && filters.customEndDate) {
    params.append('endDate', new Date(filters.customEndDate).toISOString());
  }

  if (filters.action && filters.action !== 'all') {
    params.append('action', filters.action);
  }

  if (filters.userId && filters.userId !== 'all') {
    params.append('userId', filters.userId);
  }

  if (filters.resource && filters.resource !== 'all') {
    params.append('resource', filters.resource);
  }

  if (filters.search) {
    params.append('search', filters.search);
  }

  if (entityId) {
    params.append('resourceId', entityId);
  }

  const result = await apiGet(`/api/v1/verification/audit?${params.toString()}`);
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch audit history');
  }
  return result.data as {
    data: AuditLogEntry[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
    summary: { totalEntries: number; uniqueUsers: number; configurationChanges: number; bulkOperations: number };
  };
}

async function rollbackConfiguration(
  auditLogId: string
): Promise<{ success: boolean; message: string }> {
  const result = await apiPost(`/api/v1/verification/audit/${auditLogId}/rollback`, {});
  if (!result.success) {
    throw new Error(result.error || 'Failed to rollback configuration');
  }
  return result.data as { success: boolean; message: string };
}

async function exportAuditLog(
  filters: AuditFilters,
  format: 'csv' | 'json' | 'pdf'
): Promise<Blob> {
  const params = new URLSearchParams();
  params.append('format', format);

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all' && value !== '') {
      params.append(key, value.toString());
    }
  });

  const authenticatedFetch = createAuthenticatedFetch;
  const response = await authenticatedFetch(`/api/v1/verification/audit/export?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to export audit log');
  }

  return response.blob();
}

export function ConfigurationAuditHistory({ 
  className, 
  entityId, 
  showRollbackOptions = true 
}: ConfigurationAuditHistoryProps) {
  const { token } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  
  const [filters, setFilters] = useState<AuditFilters>({
    dateRange: 'week',
    action: 'all',
    userId: 'all',
    resource: 'all',
    search: ''
  });

  const queryClient = useQueryClient();

  const { 
    data: auditData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['audit-history', filters, entityId],
    queryFn: () => {
      if (!token) throw new Error('No authentication token available');
      return fetchAuditHistory(filters, entityId);
    },
    staleTime: 30000,
    enabled: !!token,
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ auditLogId }: { auditLogId: string }) => {
      if (!token) throw new Error('No authentication token available');
      return rollbackConfiguration(auditLogId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit-history'] });
      queryClient.invalidateQueries({ queryKey: ['auto-approval-configs'] });
      setShowRollbackDialog(false);
      setSelectedEntry(null);
      toast.success('Configuration rollback successful', {
        description: data.message
      });
    },
    onError: (error: Error) => {
      toast.error('Rollback failed', {
        description: error.message
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: ({ format }: { format: 'csv' | 'json' | 'pdf' }) => {
      if (!token) throw new Error('No authentication token available');
      return exportAuditLog(filters, format);
    },
    onSuccess: (blob, { format }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setShowExportDialog(false);
      toast.success('Audit log exported successfully');
    },
    onError: (error: Error) => {
      toast.error('Export failed', {
        description: error.message
      });
    },
  });

  const actionTypes = [
    'ENTITY_AUTO_APPROVAL_ENABLED',
    'ENTITY_AUTO_APPROVAL_DISABLED',
    'AUTO_APPROVAL_CONFIG_UPDATED',
    'BULK_AUTO_APPROVAL_CONFIG_UPDATED',
    'GLOBAL_AUTO_APPROVAL_SETTINGS_UPDATED'
  ];

  const resourceTypes = ['Entity', 'GlobalSettings', 'AutoApproval'];

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const handleRollback = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setShowRollbackDialog(true);
  };

  const confirmRollback = () => {
    if (selectedEntry) {
      rollbackMutation.mutate({ auditLogId: selectedEntry.id });
    }
  };

  const resetFilters = () => {
    setFilters({
      dateRange: 'week',
      action: 'all',
      userId: 'all',
      resource: 'all',
      search: ''
    });
  };

  const hasActiveFilters = () => {
    return filters.dateRange !== 'week' || 
           filters.action !== 'all' || 
           filters.userId !== 'all' || 
           filters.resource !== 'all' || 
           filters.search !== '';
  };

  if (error) {
    return (
      <Card className={cn(className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <History className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Failed to load audit history
            </h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)} data-testid="configuration-audit-history">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6" />
            Configuration Audit History
          </h2>
          <p className="text-muted-foreground hidden sm:block">
            {entityId ? 'Entity-specific configuration changes' : 'All configuration changes and audit trail'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            size="sm"
          >
            <Filter className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters() && <Badge variant="destructive" className="ml-2">!</Badge>}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            size="sm"
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={cn('h-4 w-4 sm:mr-2', isLoading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filter Audit Entries</CardTitle>
            <CardDescription>
              Filter audit log entries by date, action, user, or resource
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Date Range</Label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(value: any) => setFilters({ ...filters, dateRange: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Past Week</SelectItem>
                    <SelectItem value="month">Past Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Action Type</Label>
                <Select
                  value={filters.action}
                  onValueChange={(value) => setFilters({ ...filters, action: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {actionTypes.map(action => (
                      <SelectItem key={action} value={action}>
                        {action.replace(/_/g, ' ').toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Resource</Label>
                <Select
                  value={filters.resource}
                  onValueChange={(value) => setFilters({ ...filters, resource: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    {resourceTypes.map(resource => (
                      <SelectItem key={resource} value={resource}>{resource}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search entries..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {filters.dateRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={filters.customStartDate || ''}
                    onChange={(e) => setFilters({ ...filters, customStartDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={filters.customEndDate || ''}
                    onChange={(e) => setFilters({ ...filters, customEndDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
              {hasActiveFilters() && (
                <Badge variant="secondary">
                  {Object.values(filters).filter(v => v && v !== 'all' && v !== '').length} active filters
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary metrics */}
      {auditData?.summary && (
        <StatCardGrid columns={4}>
          <StatCard
            label="Total Entries"
            value={auditData.summary.totalEntries}
            severity="info"
            icon={History}
          />
          <StatCard
            label="Unique Users"
            value={auditData.summary.uniqueUsers}
            severity="info"
            icon={User}
          />
          <StatCard
            label="Configuration Changes"
            value={auditData.summary.configurationChanges}
            severity="info"
            icon={Settings}
          />
          <StatCard
            label="Bulk Operations"
            value={auditData.summary.bulkOperations}
            severity="info"
            icon={History}
          />
        </StatCardGrid>
      )}

      {/* Audit entries */}
      <div className="space-y-4">
        {isLoading ? (
          <ContentSkeleton variant="card" count={5} className="space-y-4" />
        ) : auditData?.data?.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No audit entries found
                </h3>
                <p className="text-muted-foreground">
                  No configuration changes match the current filters
                </p>
                {hasActiveFilters() && (
                  <Button variant="outline" onClick={resetFilters} className="mt-4">
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          auditData?.data?.map((entry) => (
            <AuditEntryCard
              key={entry.id}
              entry={entry}
              isExpanded={expandedEntries.has(entry.id)}
              onToggleExpanded={() => toggleExpanded(entry.id)}
              onRollback={showRollbackOptions ? () => handleRollback(entry) : undefined}
            />
          ))
        )}
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Audit Log</DialogTitle>
            <DialogDescription>
              Export audit entries in your preferred format
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Export Format</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => exportMutation.mutate({ format: 'csv' })}
                  disabled={exportMutation.isPending}
                  className="w-full"
                >
                  CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportMutation.mutate({ format: 'json' })}
                  disabled={exportMutation.isPending}
                  className="w-full"
                >
                  JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportMutation.mutate({ format: 'pdf' })}
                  disabled={exportMutation.isPending}
                  className="w-full"
                >
                  PDF
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Current filters will be applied to the export:</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Date Range: {filters.dateRange}</li>
                <li>Action: {filters.action === 'all' ? 'All actions' : filters.action}</li>
                <li>Resource: {filters.resource === 'all' ? 'All resources' : filters.resource}</li>
                {filters.search && <li>Search: &quot;{filters.search}&quot;</li>}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Configuration Rollback</DialogTitle>
            <DialogDescription>
              This will revert the configuration changes made in this audit entry.
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <h4 className="font-medium mb-2">Rollback Details:</h4>
                <ul className="text-sm space-y-1">
                  <li><strong>Action:</strong> {selectedEntry.action}</li>
                  <li><strong>Resource:</strong> {selectedEntry.resourceName || selectedEntry.resourceId}</li>
                  <li><strong>Date:</strong> {format(new Date(selectedEntry.timestamp), 'PPP p')}</li>
                  <li><strong>User:</strong> {selectedEntry.userName}</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start gap-2">
                  <RotateCcw className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Important</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      This action will create a new audit entry documenting the rollback.
                      The previous configuration will be restored, but this action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRollbackDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmRollback}
              disabled={rollbackMutation.isPending}
              variant="destructive"
            >
              {rollbackMutation.isPending ? 'Rolling Back...' : 'Confirm Rollback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Individual audit entry card
interface AuditEntryCardProps {
  entry: AuditLogEntry;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onRollback?: () => void;
}

function AuditEntryCard({ 
  entry, 
  isExpanded, 
  onToggleExpanded, 
  onRollback 
}: AuditEntryCardProps) {
  const getActionBadgeColor = (action: string) => {
    if (action.includes('ENABLED')) return 'bg-green-100 text-green-800';
    if (action.includes('DISABLED')) return 'bg-red-100 text-red-800';
    if (action.includes('UPDATED')) return 'bg-blue-100 text-blue-800';
    if (action.includes('BULK')) return 'bg-purple-100 text-purple-800';
    return 'bg-muted text-foreground';
  };

  return (
    <Card className="transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
              className="p-1"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={getActionBadgeColor(entry.action)}>
                  {entry.action.replace(/_/g, ' ').toLowerCase()}
                </Badge>
                
                {entry.metadata?.bulkUpdate && (
                  <Badge variant="secondary" className="text-xs">
                    Bulk ({entry.metadata.entitiesAffected} entities)
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{entry.userName}</span> modified{' '}
                <span className="font-medium">{entry.resourceName || entry.resourceId}</span>
                {' '}• {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggleExpanded}>
              <Eye className="h-4 w-4" />
            </Button>
            
            {onRollback && (
              <Button variant="ghost" size="sm" onClick={onRollback}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(entry.oldValues).length > 0 && (
                <div>
                  <Label className="font-medium text-foreground">Previous Values</Label>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <pre className="text-xs text-red-800 whitespace-pre-wrap">
                      {JSON.stringify(entry.oldValues, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {Object.keys(entry.newValues).length > 0 && (
                <div>
                  <Label className="font-medium text-foreground">New Values</Label>
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <pre className="text-xs text-green-800 whitespace-pre-wrap">
                      {JSON.stringify(entry.newValues, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">User:</span> {entry.userName} ({entry.userRole})
              </div>
              <div>
                <span className="font-medium">Resource:</span> {entry.resource}
              </div>
              <div>
                <span className="font-medium">Timestamp:</span> {format(new Date(entry.timestamp), 'PPP p')}
              </div>
              {entry.ipAddress && (
                <div>
                  <span className="font-medium">IP Address:</span> {entry.ipAddress}
                </div>
              )}
              {entry.metadata?.reason && (
                <div className="md:col-span-2">
                  <span className="font-medium">Reason:</span> {entry.metadata.reason}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}