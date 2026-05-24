'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EntityForm } from '@/components/forms/EntityForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  MapPin,
  Settings,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';
import { apiGet, apiPost, apiPut, apiDelete, extractArray } from '@/lib/api';
import Link from 'next/link';

interface Entity {
  id: string;
  name: string;
  type: 'COMMUNITY' | 'WARD' | 'LGA' | 'STATE' | 'FACILITY' | 'CAMP';
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  autoApproveEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    rapidAssessments?: number;
    commitments?: number;
    assignments?: number;
  };
}

interface EntityFormData {
  name: string;
  type: 'COMMUNITY' | 'WARD' | 'LGA' | 'STATE' | 'FACILITY' | 'CAMP';
  location?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  autoApproveEnabled: boolean;
  metadata?: Record<string, any>;
}

const entityTypeConfig = {
  COMMUNITY: { label: 'Community', color: 'bg-blue-100 text-blue-800' },
  WARD: { label: 'Ward', color: 'bg-green-100 text-green-800' },
  LGA: { label: 'Local Govt', color: 'bg-purple-100 text-purple-800' },
  STATE: { label: 'State', color: 'bg-orange-100 text-orange-800' },
  FACILITY: { label: 'Facility', color: 'bg-red-100 text-red-800' },
  CAMP: { label: 'Camp', color: 'bg-yellow-100 text-yellow-800' }
} as const;

export default function EntityManagementPage() {
  useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  // Fetch entities
  const { data: entitiesData, isLoading, error, refetch } = useQuery<{
    items: Entity[];
    pagination: any;
  }>({
    queryKey: ['entities', searchTerm, typeFilter, activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (activeFilter !== 'all') params.append('isActive', activeFilter);
      
      const result = await apiGet(`/api/v1/entities?${params}`);
      if (!result.success) throw new Error(result.error || 'Failed to fetch entities');
      const inner = result.data?.data || result.data;
      return {
        items: extractArray<Entity>(inner),
        pagination: inner?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
      };
    },
    refetchInterval: 30000
  });

  // Create entity mutation
  const createEntityMutation = useMutation({
    mutationFn: async (entityData: EntityFormData) => {
      const response = await apiPost('/api/v1/entities', entityData);
      if (!response.success) throw new Error(response.error || 'Failed to create entity');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      setShowCreateForm(false);
    }
  });

  // Update entity mutation
  const updateEntityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EntityFormData }) => {
      const response = await apiPut(`/api/v1/entities/${id}`, data);
      if (!response.success) throw new Error(response.error || 'Failed to update entity');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      setEditingEntity(null);
    }
  });

  // Delete entity mutation
  const deleteEntityMutation = useMutation({
    mutationFn: async (entityId: string) => {
      const response = await apiDelete(`/api/v1/entities/${entityId}`);
      if (!response.success) throw new Error(response.error || 'Failed to delete entity');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    }
  });

  const handleCreateEntity = async (data: EntityFormData) => {
    await createEntityMutation.mutateAsync(data);
  };

  const handleUpdateEntity = async (data: EntityFormData) => {
    if (!editingEntity) return;
    await updateEntityMutation.mutateAsync({ id: editingEntity.id, data });
  };

  const handleDeleteEntity = async (entityId: string) => {
    if (confirm('Are you sure you want to delete this entity? This action cannot be undone.')) {
      await deleteEntityMutation.mutateAsync(entityId);
    }
  };

  const filteredEntities = entitiesData?.items || [];

  return (
    <RoleBasedRoute requiredRole="COORDINATOR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/coordinator/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                Coordinator Only
              </Badge>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Entity Management</h1>
            <p className="text-gray-600 mt-2">
              Create and manage entities within the crisis management system
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Entity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Create New Entity</DialogTitle>
                  <DialogDescription>
                    Add a new entity to the crisis management system
                  </DialogDescription>
                </DialogHeader>
                <EntityForm
                  onSubmit={handleCreateEntity}
                  onCancel={() => setShowCreateForm(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        {entitiesData && (
          <StatCardGrid columns={4} gap="lg">
            <StatCard label="Total Entities" value={entitiesData.items.length} severity="info" icon={Building2} />
            <StatCard label="Active Entities" value={entitiesData.items.filter(e => e.isActive).length} severity="success" icon={CheckCircle} />
            <StatCard label="Auto-Approval Enabled" value={entitiesData.items.filter(e => e.autoApproveEnabled).length} severity="info" icon={Settings} />
            <StatCard label="With Coordinates" value={entitiesData.items.filter(e => e.coordinates).length} severity="info" icon={MapPin} />
          </StatCardGrid>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(entityTypeConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active Only</SelectItem>
                  <SelectItem value="false">Inactive Only</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setActiveFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load entities. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Entities List */}
        <Card>
          <CardHeader>
            <CardTitle>Entities</CardTitle>
            <CardDescription>
              {filteredEntities.length > 0 
                ? `Showing ${filteredEntities.length} entities`
                : 'No entities found'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ContentSkeleton variant="list" count={5} />
            ) : filteredEntities.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No entities found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || typeFilter !== 'all' || activeFilter !== 'all'
                    ? 'No entities match the current filters.'
                    : 'Get started by creating your first entity.'
                  }
                </p>
                {!searchTerm && typeFilter === 'all' && activeFilter === 'all' && (
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Entity
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEntities.map((entity) => (
                  <Card key={entity.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{entity.name}</h3>
                            <Badge className={entityTypeConfig[entity.type].color}>
                              {entityTypeConfig[entity.type].label}
                            </Badge>
                            {!entity.isActive && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            {entity.autoApproveEnabled && (
                              <Badge className="bg-green-100 text-green-800">
                                Auto-Approval
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid gap-2 md:grid-cols-3 text-sm text-muted-foreground mb-3">
                            {entity.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{entity.location}</span>
                              </div>
                            )}
                            {entity.coordinates && entity.coordinates.latitude && entity.coordinates.longitude && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>
                                  {entity.coordinates.latitude.toFixed(4)}, {entity.coordinates.longitude.toFixed(4)}
                                </span>
                              </div>
                            )}
                            <div>
                              Created: {new Date(entity.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Statistics */}
                          {entity._count && (
                            <div className="flex gap-4 text-sm">
                              <span className="text-blue-600">
                                {entity._count.rapidAssessments || 0} Assessments
                              </span>
                              <span className="text-green-600">
                                {entity._count.commitments || 0} Commitments
                              </span>
                              <span className="text-purple-600">
                                {entity._count.assignments || 0} Assignments
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Dialog 
                            open={editingEntity?.id === entity.id} 
                            onOpenChange={(open) => !open && setEditingEntity(null)}
                          >
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setEditingEntity(entity)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Edit Entity</DialogTitle>
                                <DialogDescription>
                                  Update the entity information
                                </DialogDescription>
                              </DialogHeader>
                              <EntityForm
                                onSubmit={handleUpdateEntity}
                                onCancel={() => setEditingEntity(null)}
                                initialData={editingEntity || undefined}
                                isEditing={true}
                              />
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEntity(entity.id)}
                            disabled={deleteEntityMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleBasedRoute>
  );
}