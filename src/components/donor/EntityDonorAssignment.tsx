'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Plus,
  Search,
  Filter,
  MapPin,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Building,
  User,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, extractArray } from '@/lib/api';
import type { Donor, Entity, Incident, DonorCommitment } from '@prisma/client';

interface EntityDonorAssignmentProps {
  className?: string;
}

interface CommitmentFormData {
  donorId: string;
  entityId: string;
  incidentId: string;
  items: Array<{
    name: string;
    unit: string;
    quantity: number;
    estimatedValue?: number;
  }>;
  notes: string;
}

export function EntityDonorAssignment({ className }: EntityDonorAssignmentProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    entityId: 'all',
    donorId: 'all',
    status: 'all'
  });
  const [formData, setFormData] = useState<CommitmentFormData>({
    donorId: '',
    entityId: '',
    incidentId: '',
    items: [],
    notes: ''
  });

  // Fetch existing commitments
  const { data: commitmentsData, isLoading, error, refetch } = useQuery<{
    data: (DonorCommitment & { donor: Donor; entity: Entity; incident: Incident })[];
    pagination: any;
  }>({
    queryKey: ['entity-donor-assignments', filters, searchTerm],
    enabled: isAuthenticated,
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });
      if (searchTerm) params.append('search', searchTerm);

      const result = await apiGet(`/api/v1/entities/commitments?${params}`);
      if (!result.success) throw new Error(result.error || 'Failed to fetch assignments');
      return result.data || { data: [], pagination: {} };
    }
  });

  // Fetch entities for dropdown
  const { data: entities } = useQuery<Entity[]>({
    queryKey: ['entities'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const result = await apiGet('/api/v1/entities');
      if (!result.success) return [];
      return extractArray<Entity>(result.data);
    }
  });

  // Fetch donors for dropdown
  const { data: donors } = useQuery<Donor[]>({
    queryKey: ['donors'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const result = await apiGet('/api/v1/donors');
      if (!result.success) return [];
      return extractArray<Donor>(result.data);
    }
  });

  // Fetch incidents for dropdown
  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ['incidents'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const result = await apiGet('/api/v1/incidents');
      if (!result.success) return [];
      return extractArray<Incident>(result.data);
    }
  });

  // Create commitment mutation
  const createCommitmentMutation = useMutation({
    mutationFn: async (data: CommitmentFormData) => {
      const result = await apiPost('/api/v1/commitments', data);
      if (!result.success) throw new Error(result.error || 'Failed to create commitment');
      return result.data;
    },
    onSuccess: () => {
      toast.success('Commitment created successfully!');
      setShowCreateDialog(false);
      setFormData({
        donorId: '',
        entityId: '',
        incidentId: '',
        items: [],
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['entity-donor-assignments'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create commitment');
    }
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async ({ commitmentId, donorId }: { commitmentId: string; donorId: string }) => {
      const result = await apiPost(`/api/v1/commitments/${commitmentId}/notify`);
      if (!result.success) throw new Error(result.error || 'Failed to send notification');
      return result.data;
    },
    onSuccess: () => {
      toast.success('Notification sent to donor!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send notification');
    }
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFormChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', unit: '', quantity: 1, estimatedValue: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleCreateCommitment = () => {
    if (!formData.donorId || !formData.entityId || !formData.incidentId || formData.items.length === 0) {
      toast.error('Please fill in all required fields and add at least one item');
      return;
    }

    const validItems = formData.items.filter(item => item.name && item.unit && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one complete item');
      return;
    }

    createCommitmentMutation.mutate({
      ...formData,
      items: validItems
    });
  };

  const handleSendNotification = (commitmentId: string, donorId: string) => {
    sendNotificationMutation.mutate({ commitmentId, donorId });
  };

  const COMMITMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    PLANNED: Clock,
    PARTIAL: Package,
    COMPLETE: CheckCircle2,
    CANCELLED: X
  }

  const getStatusBadge = (status: string) => {
    const Icon = COMMITMENT_ICONS[status] || Clock
    return <StatusBadge domain="commitment" status={status} icon={Icon} />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load entity-donor assignments. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {/* Header with Create Button */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5" />
                Entity-Donor Commitments
              </CardTitle>
              <CardDescription>
                Manage donor commitments to entities and track resource assignments
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Commitment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Commitment</DialogTitle>
                  <DialogDescription>
                    Assign a donor to support an entity with specific resources
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="donorId">Donor *</Label>
                      <Select value={formData.donorId} onValueChange={(value) => handleFormChange('donorId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select donor" />
                        </SelectTrigger>
                        <SelectContent>
                          {(donors || []).map((donor) => (
                            <SelectItem key={donor.id} value={donor.id}>
                              {donor.name} ({donor.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="entityId">Entity *</Label>
                      <Select value={formData.entityId} onValueChange={(value) => handleFormChange('entityId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                        <SelectContent>
                          {(entities || []).map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="incidentId">Incident *</Label>
                    <Select value={formData.incidentId} onValueChange={(value) => handleFormChange('incidentId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select incident" />
                      </SelectTrigger>
                      <SelectContent>
                        {(incidents || []).map((incident) => (
                          <SelectItem key={incident.id} value={incident.id}>
                            {incident.type} - {incident.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Commitment Items *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {formData.items.map((item, index) => (
                        <div key={index} className="grid gap-2 md:grid-cols-5">
                          <Input
                            placeholder="Item name"
                            value={item.name}
                            onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          />
                          <Input
                            placeholder="Unit"
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder="Quantity"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          />
                          <Input
                            type="number"
                            placeholder="Est. Value ($)"
                            value={item.estimatedValue || ''}
                            onChange={(e) => handleItemChange(index, 'estimatedValue', parseFloat(e.target.value) || 0)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {formData.items.length === 0 && (
                        <p className="text-muted-foreground text-sm">No items added. Click &quot;Add Item&quot; to begin.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes about this commitment..."
                      value={formData.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateCommitment}
                      disabled={createCommitmentMutation.isPending}
                    >
                      {createCommitmentMutation.isPending ? 'Creating...' : 'Create Commitment'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
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
                placeholder="Search commitments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.entityId} onValueChange={(value) => handleFilterChange('entityId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {(entities || []).map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.donorId} onValueChange={(value) => handleFilterChange('donorId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Donors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Donors</SelectItem>
                {(donors || []).map((donor) => (
                  <SelectItem key={donor.id} value={donor.id}>
                    {donor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PLANNED">Planned</SelectItem>
                <SelectItem value="PARTIAL">In Progress</SelectItem>
                <SelectItem value="COMPLETE">Complete</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Commitments List */}
      <Card>
        <CardHeader>
          <CardTitle>Entity-Donor Commitments</CardTitle>
          <CardDescription>
            {commitmentsData?.pagination ? 
              `Showing ${commitmentsData.data.length} commitments` :
              'All donor commitments to entities'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : commitmentsData?.data?.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No commitments found
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first entity-donor commitment to get started.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Commitment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {commitmentsData?.data?.map((commitment) => (
                <Card key={commitment.id} className="bg-emerald-500/5 border-emerald-500/15">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-lg">
                            {(commitment.items as any)?.length === 1 
                              ? `${(commitment.items as any)[0]?.quantity} ${(commitment.items as any)[0]?.unit} of ${(commitment.items as any)[0]?.name}`
                              : `${(commitment.items as any)?.length || 0} items`
                            }
                          </h3>
                          {getStatusBadge(commitment.status)}
                        </div>
                        
                        <div className="grid gap-2 md:grid-cols-2 text-sm mb-3">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span><strong>Entity:</strong> {commitment.entity.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span><strong>Donor:</strong> {commitment.donor.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span><strong>Incident:</strong> {commitment.incident.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span><strong>Committed:</strong> {formatDate(commitment.commitmentDate.toISOString())}</span>
                          </div>
                        </div>

                        {/* Donor Contact Info */}
                        <div className="grid gap-2 md:grid-cols-2 text-sm text-muted-foreground mb-3 p-3 bg-muted/50 rounded">
                          {commitment.donor.contactEmail && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{commitment.donor.contactEmail}</span>
                            </div>
                          )}
                          {commitment.donor.contactPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{commitment.donor.contactPhone}</span>
                            </div>
                          )}
                        </div>

                        {/* Items Summary */}
                        {(commitment.items as any)?.length > 0 && (
                          <div className="bg-muted/50 rounded-lg p-3 mb-3">
                            <h4 className="font-medium text-sm mb-2">Committed Items:</h4>
                            <div className="grid gap-1 text-sm">
                              {Array.isArray(commitment.items) && commitment.items.map((item: any, index: number) => (
                                <div key={index} className="flex justify-between">
                                  <span>{item.quantity} {item.unit} of {item.name}</span>
                                  <span className="text-muted-foreground">
                                    ${item.estimatedValue ? (item.estimatedValue * item.quantity).toLocaleString() : 'N/A'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {commitment.notes && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Notes:</strong> {commitment.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {commitment.status === 'PLANNED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendNotification(commitment.id, commitment.donorId)}
                            disabled={sendNotificationMutation.isPending}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Notify
                          </Button>
                        )}
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
  );
}