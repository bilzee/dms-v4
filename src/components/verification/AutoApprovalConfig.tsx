'use client';

import { useState, useEffect } from 'react';
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
  History,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';
import { apiGet, apiPut } from '@/lib/api';
import type { AutoApprovalConfig } from '@/types/verification';

interface AutoApprovalConfigProps {
  className?: string;
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

async function fetchAutoApprovalConfigs(): Promise<{
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
  const result = await apiGet('/api/v1/verification/auto-approval')
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch auto-approval configurations')
  }
  return result.data as {
    data: AutoApprovalConfigData[];
    summary: {
      totalEntities: number;
      enabledCount: number;
      disabledCount: number;
      totalAutoVerifiedAssessments: number;
      totalAutoVerifiedResponses: number;
      totalAutoVerified: number;
    };
  }
}

async function updateEntityAutoApproval(
  entityId: string,
  config: { enabled: boolean; conditions?: any }
): Promise<AutoApprovalConfigData> {
  const result = await apiPut(`/api/v1/entities/${entityId}/auto-approval`, config)
  if (!result.success) {
    throw new Error(result.error || 'Failed to update auto-approval configuration')
  }
  return result.data as AutoApprovalConfigData
}

async function bulkUpdateAutoApproval(
  entityIds: string[],
  config: { enabled: boolean; conditions?: any }
): Promise<AutoApprovalConfigData[]> {
  const result = await apiPut('/api/v1/verification/auto-approval', { entityIds, ...config })
  if (!result.success) {
    throw new Error(result.error || 'Failed to bulk update auto-approval configurations')
  }
  return result.data as AutoApprovalConfigData[]
}

export function AutoApprovalConfig({ className }: AutoApprovalConfigProps) {
  const { token } = useAuth();
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkConfig, setBulkConfig] = useState({
    enabled: true,
    scope: 'both' as 'assessments' | 'responses' | 'both',
    conditions: {
      assessmentTypes: [] as string[],
      responseTypes: [] as string[],
      maxPriority: 'MEDIUM' as const,
      requiresDocumentation: false,
    }
  });

  const queryClient = useQueryClient();

  const { 
    data: configData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['auto-approval-configs'],
    queryFn: () => {
      if (!token) throw new Error('No authentication token available');
      return fetchAutoApprovalConfigs();
    },
    staleTime: 60000, // 1 minute
    enabled: !!token, // Only run query if token exists
  });

  const updateMutation = useMutation({
    mutationFn: ({ entityId, config }: { entityId: string; config: any }) => {
      if (!token) throw new Error('No authentication token available');
      return updateEntityAutoApproval(entityId, config);
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
    mutationFn: ({ entityIds, config }: { entityIds: string[]; config: any }) => {
      if (!token) throw new Error('No authentication token available');
      return bulkUpdateAutoApproval(entityIds, config);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['auto-approval-configs'] });
      setSelectedEntities(new Set());
      setShowBulkDialog(false);
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
  
  const handleToggleEntity = (entityId: string) => {
    const newSelected = new Set(selectedEntities);
    if (newSelected.has(entityId)) {
      newSelected.delete(entityId);
    } else {
      newSelected.add(entityId);
    }
    setSelectedEntities(newSelected);
  };

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
      config: bulkConfig
    });
  };

  const selectAll = () => {
    if (configData?.data) {
      setSelectedEntities(new Set(configData.data.map(entity => entity.entityId)));
    }
  };

  const selectNone = () => {
    setSelectedEntities(new Set());
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
    <div className={cn('space-y-6', className)} data-testid="auto-approval-config">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Auto-Approval Configuration</h2>
          <p className="text-muted-foreground">
            Manage automatic verification settings for entities
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary metrics */}
      {configData?.summary && (
        <StatCardGrid columns={4}>
          <StatCard
            label="Total Entities"
            value={configData.summary.totalEntities}
            severity="info"
            icon={MapPin}
          />
          <StatCard
            label="Auto-Approval Enabled"
            value={configData.summary.enabledCount}
            severity="success"
            icon={Shield}
          />
          <StatCard
            label="Manual Verification"
            value={configData.summary.disabledCount}
            severity="warning"
            icon={Settings}
          />
          <StatCard
            label="Auto-Verified Assessments"
            value={configData.summary.totalAutoVerifiedAssessments}
            severity="success"
            icon={CheckCircle}
          />
          <StatCard
            label="Auto-Verified Responses"
            value={configData.summary.totalAutoVerifiedResponses}
            severity="success"
            icon={CheckCircle}
          />
        </StatCardGrid>
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
                  onClick={selectAll}
                >
                  Select All
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
          <ContentSkeleton variant="card" count={5} className="space-y-4" />
        ) : configData?.data?.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No entities found
                </h3>
                <p className="text-gray-600">
                  No entities are available for auto-approval configuration
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          configData?.data?.map((entity) => (
            <EntityConfigCard
              key={entity.entityId}
              entity={entity}
              isSelected={selectedEntities.has(entity.entityId)}
              onToggleSelection={() => handleToggleEntity(entity.entityId)}
              onQuickToggle={(enabled) => handleQuickToggle(entity.entityId, enabled)}
              isUpdating={updateMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Bulk configuration dialog */}
      <BulkConfigDialog
        isOpen={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        onConfirm={handleBulkUpdate}
        config={bulkConfig}
        onConfigChange={setBulkConfig}
        selectedCount={selectedEntities.size}
        isLoading={bulkUpdateMutation.isPending}
        assessmentTypes={assessmentTypes}
        responseTypes={responseTypes}
      />
    </div>
  );
}

// Individual entity configuration card
interface EntityConfigCardProps {
  entity: AutoApprovalConfigData;
  isSelected: boolean;
  onToggleSelection: () => void;
  onQuickToggle: (enabled: boolean) => void;
  isUpdating: boolean;
}

function EntityConfigCard({
  entity,
  isSelected,
  onToggleSelection,
  onQuickToggle,
  isUpdating
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
            {entity.stats && (
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
              <Label htmlFor={`auto-approval-${entity.entityId}`} className="text-sm">
                Auto-Approval
              </Label>
              <Switch
                id={`auto-approval-${entity.entityId}`}
                checked={entity.enabled}
                onCheckedChange={onQuickToggle}
                disabled={isUpdating}
              />
            </div>
          </div>
        </div>

        {/* Configuration details */}
        {entity.enabled && (
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
                <Label className="font-medium text-gray-700">Assessment Types</Label>
                <div className="mt-1">
                  {entity.conditions.assessmentTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {entity.conditions.assessmentTypes.map(type => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">All types</span>
                  )}
                </div>
              </div>
              
              <div>
                <Label className="font-medium text-gray-700">Response Types</Label>
                <div className="mt-1">
                  {entity.conditions.responseTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {entity.conditions.responseTypes.map(type => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">All types</span>
                  )}
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

// Bulk configuration dialog
interface BulkConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  config: any;
  onConfigChange: (config: any) => void;
  selectedCount: number;
  isLoading: boolean;
  assessmentTypes: string[];
  responseTypes: string[];
}

function BulkConfigDialog({
  isOpen,
  onClose,
  onConfirm,
  config,
  onConfigChange,
  selectedCount,
  isLoading,
  assessmentTypes,
  responseTypes
}: BulkConfigDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 shadow-xl backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Bulk Auto-Approval Configuration</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Configure auto-approval settings for {selectedCount} selected entities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="bulk-enabled"
              checked={config.enabled}
              onCheckedChange={(enabled) => 
                onConfigChange({ ...config, enabled })
              }
            />
            <Label htmlFor="bulk-enabled" className="text-gray-800 dark:text-gray-200">Enable auto-approval</Label>
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
                      scope: value
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

              {config.scope !== 'responses' && (
                <div>
                  <Label className="text-gray-800 dark:text-gray-200">Assessment Types (leave empty for all)</Label>
                  <div className="mt-2 space-y-2">
                  {assessmentTypes.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-type-${type}`}
                        checked={config.conditions.assessmentTypes.includes(type)}
                        onCheckedChange={(checked) => {
                          const types = config.conditions.assessmentTypes;
                          const newTypes = checked
                            ? [...types, type]
                            : types.filter((t: string) => t !== type);
                          onConfigChange({
                            ...config,
                            conditions: { ...config.conditions, assessmentTypes: newTypes }
                          });
                        }}
                      />
                      <Label htmlFor={`bulk-type-${type}`} className="text-gray-700 dark:text-gray-300">{type}</Label>
                    </div>
                  ))}
                </div>
              </div>
              )}

              {config.scope !== 'assessments' && (
                <div>
                  <Label className="text-gray-800 dark:text-gray-200">Response Types (leave empty for all)</Label>
                  <div className="mt-2 space-y-2">
                  {responseTypes.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-response-type-${type}`}
                        checked={config.conditions.responseTypes.includes(type)}
                        onCheckedChange={(checked) => {
                          const types = config.conditions.responseTypes;
                          const newTypes = checked
                            ? [...types, type]
                            : types.filter((t: string) => t !== type);
                          onConfigChange({
                            ...config,
                            conditions: { ...config.conditions, responseTypes: newTypes }
                          });
                        }}
                      />
                      <Label htmlFor={`bulk-response-type-${type}`} className="text-gray-700 dark:text-gray-300">{type}</Label>
                    </div>
                  ))}
                </div>
              </div>
              )}

              <div>
                <Label className="text-gray-800 dark:text-gray-200">Maximum Priority Level</Label>
                <Select
                  value={config.conditions.maxPriority}
                  onValueChange={(value) =>
                    onConfigChange({
                      ...config,
                      conditions: { ...config.conditions, maxPriority: value }
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
                      conditions: { ...config.conditions, requiresDocumentation: checked }
                    })
                  }
                />
                <Label htmlFor="bulk-documentation" className="text-gray-700 dark:text-gray-300">Require documentation</Label>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Updating...' : `Update ${selectedCount} Entities`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}