'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  Minus, 
  Filter, 
  Eye, 
  Settings, 
  Database,
  BarChart3,
  Users,
  MapPin,
  AlertCircle,
  CheckCircle2
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { DataSourceType, ReportFiltersSchema, ReportFilters, FilterConfig, AggregationConfig, AggregationFunction } from '@/lib/reports/data-aggregator';
import { DataAggregator } from '@/lib/reports/data-aggregator';

interface DataSourceConfiguratorProps {
  dataSourceType: DataSourceType;
  onFiltersChange: (filters: ReportFilters) => void;
  initialFilters?: Partial<ReportFilters>;
  showPreview?: boolean;
  className?: string;
}

export function DataSourceConfigurator({ 
  dataSourceType, 
  onFiltersChange, 
  initialFilters = {},
  showPreview = true,
  className 
}: DataSourceConfiguratorProps) {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: undefined,
    filters: [],
    aggregations: [],
    search: '',
    orderBy: undefined,
    limit: 1000,
    ...initialFilters
  });

  const [activeTab, setActiveTab] = useState<'filters' | 'aggregations' | 'preview'>('filters');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Get available fields for the data source
  const { data: availableFields, isLoading: fieldsLoading } = useQuery({
    queryKey: ['available-fields', dataSourceType],
    queryFn: () => DataAggregator.getAvailableFields(dataSourceType),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Get data preview
  const { data: previewData, isLoading: previewLoading, error: previewError } = useQuery({
    queryKey: ['data-preview', dataSourceType, filters],
    queryFn: () => DataAggregator.getDataPreview(dataSourceType, filters, 50),
    enabled: showPreview && activeTab === 'preview',
    placeholderData: (previousData) => previousData
  });

  // Update parent when filters change
  useEffect(() => {
    const filtersToUse = {
      ...filters,
      search: debouncedSearch
    };
    
    const validationResult = ReportFiltersSchema.safeParse(filtersToUse);
    if (validationResult.success) {
      onFiltersChange(validationResult.data);
    }
  }, [filters, debouncedSearch, onFiltersChange]);

  // Filter operators based on field type
  const getOperatorsForFieldType = (fieldType: string) => {
    switch (fieldType) {
      case 'number':
        return [
          { value: 'eq', label: 'Equals' },
          { value: 'ne', label: 'Not Equals' },
          { value: 'gt', label: 'Greater Than' },
          { value: 'gte', label: 'Greater or Equal' },
          { value: 'lt', label: 'Less Than' },
          { value: 'lte', label: 'Less or Equal' },
          { value: 'in', label: 'In List' },
          { value: 'nin', label: 'Not In List' }
        ];
      case 'string':
        return [
          { value: 'eq', label: 'Equals' },
          { value: 'ne', label: 'Not Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'startsWith', label: 'Starts With' },
          { value: 'endsWith', label: 'Ends With' },
          { value: 'in', label: 'In List' },
          { value: 'nin', label: 'Not In List' }
        ];
      case 'date':
        return [
          { value: 'eq', label: 'Equals' },
          { value: 'ne', label: 'Not Equals' },
          { value: 'gt', label: 'After' },
          { value: 'gte', label: 'On or After' },
          { value: 'lt', label: 'Before' },
          { value: 'lte', label: 'On or Before' },
          { value: 'in', label: 'In List' }
        ];
      case 'boolean':
        return [
          { value: 'eq', label: 'Is' },
          { value: 'ne', label: 'Is Not' }
        ];
      default:
        return [
          { value: 'eq', label: 'Equals' },
          { value: 'ne', label: 'Not Equals' },
          { value: 'contains', label: 'Contains' }
        ];
    }
  };

  // Add filter
  const addFilter = useCallback(() => {
    const newFilter: FilterConfig = {
      field: '',
      operator: 'eq',
      value: '',
      logicalOperator: 'and'
    };
    setFilters(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  }, []);

  // Remove filter
  const removeFilter = useCallback((index: number) => {
    setFilters(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  }, []);

  // Update filter
  const updateFilter = useCallback((index: number, updates: Partial<FilterConfig>) => {
    setFilters(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { ...filter, ...updates } : filter
      )
    }));
  }, []);

  // Add aggregation
  const addAggregation = useCallback(() => {
    const newAggregation: AggregationConfig = {
      id: `agg_${Date.now()}`,
      field: '',
      function: AggregationFunction.COUNT,
      groupBy: [],
      alias: ''
    };
    setFilters(prev => ({
      ...prev,
      aggregations: [...prev.aggregations, newAggregation]
    }));
  }, []);

  // Remove aggregation
  const removeAggregation = useCallback((id: string) => {
    setFilters(prev => ({
      ...prev,
      aggregations: prev.aggregations.filter(agg => agg.id !== id)
    }));
  }, []);

  // Update aggregation
  const updateAggregation = useCallback((id: string, updates: Partial<AggregationConfig>) => {
    setFilters(prev => ({
      ...prev,
      aggregations: prev.aggregations.map(agg => 
        agg.id === id ? { ...agg, ...updates } : agg
      )
    }));
  }, []);

  // Get current filter
  const getCurrentFilter = (index: number) => filters.filters[index] || null;
  const getCurrentAggregation = (id: string) => filters.aggregations.find(agg => agg.id === id) || null;

  const getDataSourceIcon = () => {
    switch (dataSourceType) {
      case DataSourceType.ASSESSMENTS: return <BarChart3 className="h-4 w-4" />;
      case DataSourceType.RESPONSES: return <Settings className="h-4 w-4" />;
      case DataSourceType.ENTITIES: return <MapPin className="h-4 w-4" />;
      case DataSourceType.DONORS: return <Users className="h-4 w-4" />;
      case DataSourceType.COMMITMENTS: return <Database className="h-4 w-4" />;
      case DataSourceType.INCIDENTS: return <AlertCircle className="h-4 w-4" />;
      case DataSourceType.PRELIMINARY_ASSESSMENTS: return <BarChart3 className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getDataSourceLabel = () => {
    return dataSourceType.charAt(0).toUpperCase() + dataSourceType.slice(1).replace(/_/g, ' ');
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getDataSourceIcon()}
          <div>
            <h2 className="text-lg font-semibold">Data Source: {getDataSourceLabel()}</h2>
            <p className="text-sm text-muted-foreground">
              Configure filters and aggregations for your report
            </p>
          </div>
        </div>
        <Badge variant="outline">
          {filters.aggregations.length} aggregations
        </Badge>
      </div>

      {/* Global Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search across all fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Date Range
          </CardTitle>
          <CardDescription>
            Limit data to a specific time period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.dateRange?.startDate || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: {
                    field: 'createdAt',
                    startDate: e.target.value,
                    endDate: prev.dateRange?.endDate || ''
                  }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.dateRange?.endDate || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  dateRange: {
                    field: 'createdAt',
                    startDate: prev.dateRange?.startDate || '',
                    endDate: e.target.value
                  }
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="filters" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {filters.filters.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {filters.filters.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="aggregations" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Aggregations
            {filters.aggregations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {filters.aggregations.length}
              </Badge>
            )}
          </TabsTrigger>
          {showPreview && (
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          )}
        </TabsList>

        {/* Filters Tab */}
        <TabsContent value="filters" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Custom Filters</h3>
            <Button onClick={addFilter} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add Filter
            </Button>
          </div>

          {filters.filters.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">No filters configured</p>
              <p className="text-xs text-muted-foreground">
                Add filters to narrow down your data
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {filters.filters.map((filter, index) => {
                  const currentFilter = getCurrentFilter(index);
                  if (!currentFilter) return null;

                  const selectedField = availableFields?.find(f => f.field === currentFilter.field);
                  const operators = selectedField ? getOperatorsForFieldType(selectedField.type) : [];

                  return (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Filter {index + 1}</h4>
                          <Button
                            onClick={() => removeFilter(index)}
                            size="sm"
                            variant="ghost"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          {/* Field Selection */}
                          <div>
                            <Label>Field</Label>
                            <Select
                              value={currentFilter.field}
                              onValueChange={(value) => updateFilter(index, { field: value, operator: 'eq', value: '' })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields?.map((field) => (
                                  <SelectItem key={field.field} value={field.field}>
                                    {field.field.replace(/\./g, ' → ')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Operator Selection */}
                          <div>
                            <Label>Operator</Label>
                            <Select
                              value={currentFilter.operator}
                              onValueChange={(value) => updateFilter(index, { operator: value as any })}
                              disabled={!currentFilter.field}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select operator" />
                              </SelectTrigger>
                              <SelectContent>
                                {operators.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Value Input */}
                          <div>
                            <Label>Value</Label>
                            <Input
                              value={currentFilter.value || ''}
                              onChange={(e) => updateFilter(index, { value: e.target.value })}
                              placeholder="Enter value"
                              disabled={!currentFilter.field || !currentFilter.operator}
                              type={selectedField?.type === 'number' ? 'number' : 
                                   selectedField?.type === 'date' ? 'date' : 'text'}
                            />
                          </div>

                          {/* Logical Operator */}
                          <div>
                            <Label>Logic</Label>
                            <Select
                              value={currentFilter.logicalOperator}
                              onValueChange={(value) => updateFilter(index, { logicalOperator: value as any })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="and">AND</SelectItem>
                                <SelectItem value="or">OR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Field Description */}
                        {selectedField && (
                          <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                            <strong>{selectedField.field}:</strong> {selectedField.description}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Aggregations Tab */}
        <TabsContent value="aggregations" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Data Aggregations</h3>
            <Button onClick={addAggregation} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add Aggregation
            </Button>
          </div>

          {filters.aggregations.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">No aggregations configured</p>
              <p className="text-xs text-muted-foreground">
                Add aggregations to calculate summary statistics
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {filters.aggregations.map((aggregation) => {
                  const currentAgg = getCurrentAggregation(aggregation.id);
                  if (!currentAgg) return null;

                  return (
                    <Card key={aggregation.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">
                            {currentAgg.alias || `${currentAgg.function}_${currentAgg.field}`}
                          </h4>
                          <Button
                            onClick={() => removeAggregation(aggregation.id)}
                            size="sm"
                            variant="ghost"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Field Selection */}
                          <div>
                            <Label>Field</Label>
                            <Select
                              value={currentAgg.field}
                              onValueChange={(value) => updateAggregation(aggregation.id, { field: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields?.map((field) => (
                                  <SelectItem key={field.field} value={field.field}>
                                    {field.field.replace(/\./g, ' → ')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Function Selection */}
                          <div>
                            <Label>Function</Label>
                            <Select
                              value={currentAgg.function}
                              onValueChange={(value) => updateAggregation(aggregation.id, { function: value as any })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="count">Count</SelectItem>
                                <SelectItem value="sum">Sum</SelectItem>
                                <SelectItem value="average">Average</SelectItem>
                                <SelectItem value="min">Minimum</SelectItem>
                                <SelectItem value="max">Maximum</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="distinct_count">Distinct Count</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Alias */}
                          <div>
                            <Label>Display Name (Optional)</Label>
                            <Input
                              value={currentAgg.alias || ''}
                              onChange={(e) => updateAggregation(aggregation.id, { alias: e.target.value })}
                              placeholder="Display name"
                            />
                          </div>
                        </div>

                        {/* Group By Fields */}
                        <div>
                          <Label>Group By (Optional)</Label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {availableFields?.map((field) => (
                              <div key={field.field} className="flex items-center space-x-1">
                                <Checkbox
                                  id={`groupby-${aggregation.id}-${field.field}`}
                                  checked={currentAgg.groupBy?.includes(field.field) || false}
                                  onCheckedChange={(checked) => {
                                    const currentGroupBy = currentAgg.groupBy || [];
                                    const newGroupBy = checked
                                      ? [...currentGroupBy, field.field]
                                      : currentGroupBy.filter(f => f !== field.field);
                                    updateAggregation(aggregation.id, { groupBy: newGroupBy });
                                  }}
                                />
                                <Label 
                                  htmlFor={`groupby-${aggregation.id}-${field.field}`}
                                  className="text-xs"
                                >
                                  {field.field.split('.').pop()}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Preview Tab */}
        {showPreview && (
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Data Preview
                </CardTitle>
                <CardDescription>
                  Sample of data with current filters applied
                </CardDescription>
              </CardHeader>
              <CardContent>
                {previewLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading preview...</p>
                    </div>
                  </div>
                ) : previewError ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">Failed to load preview</p>
                      <p className="text-xs text-muted-foreground">
                        Check your filters and try again
                      </p>
                    </div>
                  </div>
                ) : previewData && previewData.length > 0 ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Showing {previewData.length} sample records</span>
                      {filters.filters.length > 0 && (
                        <Badge variant="outline">
                          {filters.filters.length} filters applied
                        </Badge>
                      )}
                    </div>

                    {/* Data Table */}
                    <ScrollArea className="h-96 border rounded-md">
                      <div className="min-w-full">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              {Object.keys(previewData[0] || {}).map((key) => (
                                <th key={key} className="px-4 py-2 text-left font-medium border-b">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.map((row, index) => (
                              <tr key={index} className="border-b hover:bg-muted">
                                {Object.values(row).map((value, cellIndex) => (
                                  <td key={cellIndex} className="px-4 py-2 text-left">
                                    {value === null || value === undefined ? (
                                      <span className="text-muted-foreground italic">null</span>
                                    ) : typeof value === 'object' ? (
                                      <span className="text-muted-foreground text-xs">
                                        {JSON.stringify(value)}
                                      </span>
                                    ) : (
                                      <span>{String(value)}</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center">
                      <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">No data found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your filters or date range
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Data Source:</span>
              <div className="font-medium">{getDataSourceLabel()}</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Active Filters:</span>
              <div className="font-medium">{filters.filters.length}</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Aggregations:</span>
              <div className="font-medium">{filters.aggregations.length}</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Date Range:</span>
              <div className="font-medium">
                {filters.dateRange ? 'Custom' : 'All Time'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}