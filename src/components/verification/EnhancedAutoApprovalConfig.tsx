'use client';

import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Input } from '@/components/ui/input';
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
  Shield, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  Save,
  Filter,
  MapPin,
  Search,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';
import { apiGet, apiPut, apiPost } from '@/lib/api';

interface EnhancedAutoApprovalConfigProps {
  className?: string;
  compactMode?: boolean;
  pageSize?: number;
  enableVirtualization?: boolean;
}

interface ApiResponseMeta {
  timestamp: string;
  version: string;
  requestId: string;
}

interface AutoApprovalApiResponse {
  success: boolean;
  data: AutoApprovalConfigData[];
  summary: {
    totalEntities: number;
    enabledCount: number;
    disabledCount: number;
    totalAutoVerifiedAssessments: number;
    totalAutoVerifiedResponses: number;
    totalAutoVerified: number;
  };
  meta: ApiResponseMeta;
}

interface BulkUpdateRequest {
  entityIds: string[];
  enabled: boolean;
  scope: 'assessments' | 'responses' | 'both';
  conditions?: {
    assessmentTypes?: string[];
    responseTypes?: string[];
    maxPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiresDocumentation?: boolean;
  };
}

interface EntityUpdateRequest {
  enabled: boolean;
  scope?: 'assessments' | 'responses' | 'both';
  conditions?: {
    assessmentTypes?: string[];
    responseTypes?: string[];
    maxPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiresDocumentation?: boolean;
  };
}

interface AutoApprovalConfigData {
  entityId: string;
  entityName: string;
  entityType: string;
  entityLocation?: string;
  enabled: boolean;
  scope: 'assessments' | 'responses' | 'both';
  conditions: {
    assessmentTypes: string[];
    responseTypes: string[];
    maxPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiresDocumentation: boolean;
  };
  lastModified: string;
  stats?: {
    autoVerifiedAssessments: number;
    autoVerifiedResponses: number;
    totalAutoVerified: number;
  };
}

interface ConfigurationFilters {
  entityType: string;
  location: string;
  enabledStatus: 'all' | 'enabled' | 'disabled';
  search: string;
}

interface ConflictDetection {
  hasConflicts: boolean;
  conflicts: {
    entityId: string;
    entityName: string;
    conflictType: 'scope_overlap' | 'priority_mismatch' | 'type_conflict';
    description: string;
  }[];
}

async function fetchAutoApprovalConfigs(filters?: Partial<ConfigurationFilters>): Promise<{
  data: AutoApprovalConfigData[];
  summary: {
    totalEntities: number;
    enabledCount: number;
    disabledCount: number;
    totalAutoVerifiedAssessments: number;
    totalAutoVerifiedResponses: number;
    totalAutoVerified: number;
  };
}> {
  const params = new URLSearchParams();
  if (filters?.entityType && filters.entityType !== 'all') {
    params.append('entityType', filters.entityType);
  }
  if (filters?.enabledStatus === 'enabled') {
    params.append('enabledOnly', 'true');
  }
  const qs = params.toString() ? `?${params.toString()}` : ''
  const result = await apiGet(`/api/v1/verification/auto-approval${qs}`)
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch auto-approval configurations')
  }
  // API returns { success, data: [...configs], summary: {...} }
  // result.data is the array of configurations, result.summary is the summary object
  return {
    data: result.data as AutoApprovalConfigData[],
    summary: (result as any).summary as { totalEntities: number; enabledCount: number; disabledCount: number; totalAutoVerifiedAssessments: number; totalAutoVerifiedResponses: number; totalAutoVerified: number; }
  }
}

async function detectConfigurationConflicts(entityIds: string[], config: BulkUpdateRequest): Promise<ConflictDetection> {
  const result = await apiPost('/api/v1/verification/auto-approval/validate', { entityIds, config })
  if (!result.success) {
    return { hasConflicts: false, conflicts: [] }
  }
  return result.data as ConflictDetection
}

export function EnhancedAutoApprovalConfig({ 
  className, 
  compactMode = false, 
  pageSize = 25, 
  enableVirtualization = false 
}: EnhancedAutoApprovalConfigProps) {
  const { token } = useAuth();
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filters, setFilters] = useState<ConfigurationFilters>({
    entityType: 'all',
    location: '',
    enabledStatus: 'all',
    search: ''
  });
  
  const [bulkConfig, setBulkConfig] = useState<BulkConfigState>({
    enabled: true,
    scope: 'both',
    conditions: {
      assessmentTypes: [],
      responseTypes: [],
      maxPriority: 'MEDIUM',
      requiresDocumentation: false,
    }
  });

  const [conflictCheck, setConflictCheck] = useState<ConflictDetection>({ 
    hasConflicts: false, 
    conflicts: [] 
  });
  
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);

  const queryClient = useQueryClient();

  const { 
    data: configData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['auto-approval-configs', filters],
    queryFn: () => {
      if (!token) throw new Error('No authentication token available');
      return fetchAutoApprovalConfigs(filters);
    },
    staleTime: 60000,
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ entityId, config }: { entityId: string; config: EntityUpdateRequest }) => {
      if (!token) throw new Error('No authentication token available');
      const result = await apiPut(`/api/v1/entities/${entityId}/auto-approval`, config)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update auto-approval configuration')
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['auto-approval-configs'] });
      toast.success('Auto-approval configuration updated', {
        description: `Updated settings for ${data.entityName}`
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update configuration', {
        description: error.message
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ entityIds, config }: { entityIds: string[]; config: BulkUpdateRequest }) => {
      if (!token) throw new Error('No authentication token available');
      const conflicts = await detectConfigurationConflicts(entityIds, config);
      setConflictCheck(conflicts);
      if (conflicts.hasConflicts) {
        throw new Error(`Configuration conflicts detected: ${conflicts.conflicts.map(c => c.description).join(', ')}`);
      }
      const result = await apiPut('/api/v1/verification/auto-approval', { ...config, entityIds })
      if (!result.success) {
        throw new Error(result.error || 'Failed to bulk update auto-approval configurations')
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['auto-approval-configs'] });
      setSelectedEntities(new Set());
      setShowBulkDialog(false);
      setConflictCheck({ hasConflicts: false, conflicts: [] });
      toast.success('Bulk update completed', {
        description: `Updated ${data.length} entities`
      });
    },
    onError: (error: Error) => {
      toast.error('Bulk update failed', {
        description: error.message
      });
    },
  });

  const assessmentTypes = ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'];
  const responseTypes = ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'LOGISTICS', 'POPULATION'];
  const entityTypes = ['FACILITY', 'ORGANIZATION', 'SHELTER', 'CAMP', 'DISTRIBUTION_POINT', 'OTHER'];

  // Filter data with optimization
  const filteredData = useMemo(() => {
    if (!configData?.data) return [];
    
    return configData.data.filter((entity) => {
      const matchesSearch = !filters.search || 
        entity.entityName.toLowerCase().includes(filters.search.toLowerCase()) ||
        entity.entityLocation?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesType = filters.entityType === 'all' || entity.entityType === filters.entityType;
      
      const matchesStatus = filters.enabledStatus === 'all' || 
        (filters.enabledStatus === 'enabled' && entity.enabled) ||
        (filters.enabledStatus === 'disabled' && !entity.enabled);

      const matchesLocation = !filters.location || 
        entity.entityLocation?.toLowerCase().includes(filters.location.toLowerCase());

      return matchesSearch && matchesType && matchesStatus && matchesLocation;
    });
  }, [configData?.data, filters]);
  
  // Paginated data for performance
  const paginatedData = useMemo(() => {
    if (compactMode) {
      return filteredData.slice(0, 5);
    }
    
    if (enableVirtualization && filteredData.length > 50) {
      // For large datasets, show current page only
      const start = currentPage * itemsPerPage;
      return filteredData.slice(start, start + itemsPerPage);
    }
    
    return filteredData;
  }, [filteredData, currentPage, itemsPerPage, compactMode, enableVirtualization]);
  
  // Performance metrics
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const shouldShowPagination = !compactMode && filteredData.length > itemsPerPage;

  const handleToggleEntity = useCallback((entityId: string) => {
    setSelectedEntities(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(entityId)) {
        newSelected.delete(entityId);
      } else {
        newSelected.add(entityId);
      }
      return newSelected;
    });
  }, []);

  const handleQuickToggle = (entityId: string, enabled: boolean) => {
    updateMutation.mutate({
      entityId,
      config: { enabled }
    });
  };

  const handleBulkUpdate = () => {
    if (selectedEntities.size === 0) {
      toast.error('No entities selected');
      return;
    }

    bulkUpdateMutation.mutate({
      entityIds: Array.from(selectedEntities),
      config: { ...bulkConfig, entityIds: Array.from(selectedEntities) }
    });
  };

  const selectAll = useCallback(() => {
    setSelectedEntities(new Set(filteredData.map(entity => entity.entityId)));
  }, [filteredData]);

  const selectNone = useCallback(() => {
    setSelectedEntities(new Set());
  }, []);
  
  const selectCurrentPage = useCallback(() => {
    setSelectedEntities(new Set(paginatedData.map(entity => entity.entityId)));
  }, [paginatedData]);

  const applyFilters = (newFilters: ConfigurationFilters) => {
    setFilters(newFilters);
    setShowFilterDialog(false);
  };

  const resetFilters = () => {
    setFilters({
      entityType: 'all',
      location: '',
      enabledStatus: 'all',
      search: ''
    });
  };

  if (error) {
    return (
      <Card className={cn(className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to load auto-approval configurations
            </h3>
            <p className="text-gray-600 mb-4">
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
    <div className={cn('space-y-6', className)} data-testid="enhanced-auto-approval-config">
      {/* Header with enhanced controls */}
      <div className="flex items-center justify-between">
        <div>
          {!compactMode && (
            <>
              <h2 className="text-2xl font-bold tracking-tight">Auto-Approval Configuration</h2>
              <p className="text-muted-foreground">
                Advanced management with filtering, validation, and conflict detection
              </p>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilterDialog(true)}
            size="sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search entities..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>
        
        {(filters.search || filters.entityType !== 'all' || filters.enabledStatus !== 'all' || filters.location) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Summary metrics */}
      {!compactMode && configData?.summary && (
        <StatCardGrid columns={4}>
          <StatCard
            label={shouldShowPagination ? 'Filtered Entities (Paginated)' : 'Filtered Entities'}
            value={shouldShowPagination ? `${filteredData.length} (Page ${currentPage + 1} of ${totalPages})` : filteredData.length}
            severity="info"
            icon={MapPin}
          />
          <StatCard
            label="Auto-Approval Enabled"
            value={filteredData.filter(e => e.enabled).length}
            severity="success"
            icon={Shield}
          />
          <StatCard
            label="Manual Verification"
            value={filteredData.filter(e => !e.enabled).length}
            severity="warning"
            icon={Settings}
          />
          <StatCard
            label="Total Auto-Verified"
            value={filteredData.reduce((sum, e) => sum + (e.stats?.totalAutoVerified || 0), 0)}
            severity="success"
            icon={CheckCircle}
          />
        </StatCardGrid>
      )}

      {/* Conflict warnings */}
      {conflictCheck.hasConflicts && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Configuration Conflicts Detected</h4>
                <ul className="mt-2 space-y-1 text-sm text-red-800">
                  {conflictCheck.conflicts.map((conflict, index) => (
                    <li key={index}>
                      <strong>{conflict.entityName}:</strong> {conflict.description}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk actions */}
      {selectedEntities.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedEntities.size} entities selected
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={shouldShowPagination ? selectCurrentPage : selectAll}
                >
                  Select {shouldShowPagination ? `Page (${paginatedData.length})` : `All (${filteredData.length})`}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectNone}
                >
                  Clear Selection
                </Button>
              </div>
              
              <Button
                onClick={() => setShowBulkDialog(true)}
                disabled={bulkUpdateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Bulk Configure
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entity configurations */}
      <div className="space-y-4">
        {isLoading ? (
          <ContentSkeleton variant="card" count={compactMode ? 3 : 5} className="space-y-4" />
        ) : filteredData.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No entities found
                </h3>
                <p className="text-gray-600">
                  {configData?.data?.length === 0 
                    ? 'No entities are available for auto-approval configuration'
                    : 'No entities match the current filters'
                  }
                </p>
                {filteredData.length === 0 && configData?.data && configData.data.length > 0 && (
                  <Button variant="outline" onClick={resetFilters} className="mt-4">
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          paginatedData.map((entity) => (
            <EntityConfigCard
              key={entity.entityId}
              entity={entity}
              isSelected={selectedEntities.has(entity.entityId)}
              onToggleSelection={() => handleToggleEntity(entity.entityId)}
              onQuickToggle={(enabled) => handleQuickToggle(entity.entityId, enabled)}
              isUpdating={updateMutation.isPending}
              compactMode={compactMode}
            />
          ))
        )}
        
        {compactMode && filteredData.length > 5 && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-center">
              <p className="text-gray-600">
                And {filteredData.length - 5} more entities...
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                View All Configurations
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Enhanced Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Configurations</DialogTitle>
            <DialogDescription>
              Filter entities by type, location, and status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Entity Type</Label>
              <Select
                value={filters.entityType}
                onValueChange={(value) => setFilters({ ...filters, entityType: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {entityTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Location</Label>
              <Input
                placeholder="Filter by location..."
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={filters.enabledStatus}
                onValueChange={(value: any) => setFilters({ ...filters, enabledStatus: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="enabled">Auto-Approval Enabled</SelectItem>
                  <SelectItem value="disabled">Manual Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFilterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowFilterDialog(false);
              // Filters are applied automatically via the filters state
            }}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Bulk Configuration Dialog */}
      <EnhancedBulkConfigDialog
        isOpen={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        onConfirm={handleBulkUpdate}
        config={bulkConfig}
        onConfigChange={setBulkConfig}
        selectedCount={selectedEntities.size}
        isLoading={bulkUpdateMutation.isPending}
        assessmentTypes={assessmentTypes}
        responseTypes={responseTypes}
        conflicts={conflictCheck}
      />
    </div>
  );
}

// Individual entity configuration card with enhanced features
interface EntityConfigCardProps {
  entity: AutoApprovalConfigData;
  isSelected: boolean;
  onToggleSelection: () => void;
  onQuickToggle: (enabled: boolean) => void;
  isUpdating: boolean;
  compactMode?: boolean;
}

function EntityConfigCard({
  entity,
  isSelected,
  onToggleSelection,
  onQuickToggle,
  isUpdating,
  compactMode = false
}: EntityConfigCardProps) {
  return (
    <Card className={cn(
      'transition-all duration-200',
      isSelected && 'ring-2 ring-blue-500 border-blue-200',
      entity.enabled && 'border-green-200 bg-green-50/30'
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelection}
              className="border-2 border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white"
            />
            <div>
              <h3 className="font-semibold text-gray-900">{entity.entityName}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{entity.entityType}</span>
                {entity.entityLocation && (
                  <>
                    <span>•</span>
                    <span>{entity.entityLocation}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {entity.stats && !compactMode && (
              <>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  {entity.stats.autoVerifiedAssessments} assessments
                </Badge>
                <Badge variant="outline" className="text-green-700 border-green-300">
                  {entity.stats.autoVerifiedResponses} responses
                </Badge>
              </>
            )}
            
            <div className="flex items-center gap-2">
              <Label htmlFor={`auto-approval-${entity.entityId}`} className="text-sm font-medium text-gray-800">
                Auto-Approval
              </Label>
              <Switch
                id={`auto-approval-${entity.entityId}`}
                checked={entity.enabled}
                onCheckedChange={onQuickToggle}
                disabled={isUpdating}
                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 border-2 border-gray-400 data-[state=checked]:border-green-600 [&>span]:bg-white [&>span]:shadow-md [&>span]:border [&>span]:border-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Configuration details */}
        {entity.enabled && !compactMode && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Label className="font-medium text-gray-700">Scope</Label>
                <div className="mt-1">
                  <Badge 
                    className={cn(
                      entity.scope === 'assessments' && 'bg-blue-100 text-blue-800',
                      entity.scope === 'responses' && 'bg-green-100 text-green-800',
                      entity.scope === 'both' && 'bg-purple-100 text-purple-800'
                    )}
                  >
                    {entity.scope}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="font-medium text-gray-700">Max Priority</Label>
                <div className="mt-1">
                  <StatusBadge status={entity.conditions.maxPriority} domain="severity" />
                </div>
              </div>
              
              <div>
                <Label className="font-medium text-gray-700">Documentation</Label>
                <div className="mt-1">
                  <Badge variant={entity.conditions.requiresDocumentation ? "default" : "secondary"}>
                    {entity.conditions.requiresDocumentation ? 'Required' : 'Optional'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="font-medium text-gray-700">Types</Label>
                <div className="mt-1 text-xs text-gray-600">
                  {entity.scope !== 'responses' && entity.conditions.assessmentTypes.length > 0 ? 
                    `Assessments: ${entity.conditions.assessmentTypes.length}` : 'All assessments'
                  }
                  {entity.scope === 'both' && <br />}
                  {entity.scope !== 'assessments' && entity.conditions.responseTypes.length > 0 ? 
                    `Responses: ${entity.conditions.responseTypes.length}` : 'All responses'
                  }
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-gray-500">
              Last modified: {new Date(entity.lastModified).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Enhanced bulk configuration dialog with validation
interface BulkConfigState {
  enabled: boolean;
  scope: 'assessments' | 'responses' | 'both';
  conditions: {
    assessmentTypes: string[];
    responseTypes: string[];
    maxPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiresDocumentation: boolean;
  };
}

interface EnhancedBulkConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  config: BulkConfigState;
  onConfigChange: (config: BulkConfigState) => void;
  selectedCount: number;
  isLoading: boolean;
  assessmentTypes: string[];
  responseTypes: string[];
  conflicts: ConflictDetection;
}

function EnhancedBulkConfigDialog({
  isOpen,
  onClose,
  onConfirm,
  config,
  onConfigChange,
  selectedCount,
  isLoading,
  assessmentTypes,
  responseTypes,
  conflicts
}: EnhancedBulkConfigDialogProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 shadow-xl backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">
            Bulk Configuration
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Configure auto-approval settings for {selectedCount} selected entities with conflict detection.
          </DialogDescription>
        </DialogHeader>

        {/* Conflict warnings */}
        {conflicts.hasConflicts && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-900">Conflicts Detected</h4>
                <p className="text-sm text-red-700 mt-1">
                  Please review and resolve conflicts before proceeding.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="bulk-enabled"
              checked={config.enabled}
              onCheckedChange={(enabled) => 
                onConfigChange({ ...config, enabled })
              }
              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-400 border-2 border-gray-500 data-[state=checked]:border-green-600 [&>span]:bg-white [&>span]:shadow-md [&>span]:border [&>span]:border-gray-200"
            />
            <Label htmlFor="bulk-enabled" className="text-gray-800 dark:text-gray-200 font-medium">Enable auto-approval</Label>
          </div>

          {config.enabled && (
            <>
              <div>
                <Label className="text-gray-800 dark:text-gray-200">Auto-Approval Scope</Label>
                <Select
                  value={config.scope}
                  onValueChange={(value) =>
                    onConfigChange({
                      ...config,
                      scope: value as any
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assessments">Assessments Only</SelectItem>
                    <SelectItem value="responses">Responses Only</SelectItem>
                    <SelectItem value="both">Both Assessments & Responses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-800 dark:text-gray-200">Maximum Priority Level</Label>
                <Select
                  value={config.conditions.maxPriority}
                  onValueChange={(value) =>
                    onConfigChange({
                      ...config,
                      conditions: { ...config.conditions, maxPriority: value as any }
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bulk-documentation"
                  checked={config.conditions.requiresDocumentation}
                  onCheckedChange={(checked) =>
                    onConfigChange({
                      ...config,
                      conditions: { ...config.conditions, requiresDocumentation: checked === true }
                    })
                  }
                  className="border-2 border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white"
                />
                <Label htmlFor="bulk-documentation" className="text-gray-700 dark:text-gray-300 font-medium">Require documentation</Label>
              </div>

              {/* Configuration Preview */}
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? 'Hide' : 'Show'} Configuration Preview
                </Button>
                
                {showPreview && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm">
                    <h4 className="font-medium mb-2">Configuration Summary:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Scope: {config.scope}</li>
                      <li>• Max Priority: {config.conditions.maxPriority}</li>
                      <li>• Documentation: {config.conditions.requiresDocumentation ? 'Required' : 'Optional'}</li>
                      <li>• Entities affected: {selectedCount}</li>
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isLoading || conflicts.hasConflicts}
          >
            {isLoading ? 'Updating...' : `Update ${selectedCount} Entities`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}