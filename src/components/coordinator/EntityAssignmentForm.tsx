'use client';

import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, Users, MapPin, UserPlus, Trash2, Loader2, CheckCircle, UserCheck, 
  Building, UserCheck as DonorIcon, AlertTriangle, Filter
} from 'lucide-react';

interface Entity {
  id: string;
  name: string;
  type: string;
  location: string | null;
  incidentId?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  organization?: string;
  roles: Array<{
    role: {
      id: string;
      name: string;
      description: string;
    }
  }>;
  isActive: boolean;
}

interface Donor {
  id: string;
  name: string;
  type: string;
  organization?: string;
  contactEmail?: string;
  contactPhone?: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface Assignment {
  id: string;
  userId: string;
  entityId: string;
  assignedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  entity: {
    id: string;
    name: string;
    type: string;
    location: string | null;
  };
}

// Role configuration for filtering
const ROLE_CONFIG = {
  ASSESSOR: { label: 'Assessor', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Users },
  RESPONDER: { label: 'Responder', color: 'bg-green-100 text-green-800 border-green-200', icon: UserCheck },
  DONOR: { label: 'Donor', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: DonorIcon }
};

type RoleFilter = {
  ASSESSOR: boolean;
  RESPONDER: boolean;
  DONOR: boolean;
};

export default function CoordinatorEntitiesPage() {
  const { currentRole, user, token, hasRole } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedDonorIds, setSelectedDonorIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilters, setRoleFilters] = useState<RoleFilter>({
    ASSESSOR: true,
    RESPONDER: true,
    DONOR: false
  });
  const [activeTab, setActiveTab] = useState('assign');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!token) throw new Error('No authentication token available');
      const [entitiesResult, usersResult, donorsResult, assignmentsResult] = await Promise.all([
        apiGet('/api/v1/entities'),
        apiGet('/api/v1/users/assignable'),
        apiGet('/api/v1/donors'),
        apiGet('/api/v1/entity-assignments')
      ]);
      if (entitiesResult.success) {
        const d = entitiesResult.data as any;
        setEntities(d?.data || d || []);
      }
      if (usersResult.success) {
        const d = usersResult.data as any;
        setUsers(d?.data || d || []);
      }
      if (donorsResult.success) {
        const d = donorsResult.data as any;
        setDonors(d?.data || d || []);
      }
      if (assignmentsResult.success) {
        const d = assignmentsResult.data as any;
        setAssignments(d?.data || d || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assignUsersAndDonorsToEntity = async () => {
    if (!selectedEntity || (selectedUserIds.length === 0 && selectedDonorIds.length === 0)) return;

    setIsAssigning(true);
    try {
      if (!token) throw new Error('No authentication token available');
      
      const userAssignments = selectedUserIds.map(userId =>
        apiPost('/api/v1/entity-assignments', {
          userId,
          entityId: selectedEntity,
          assignedBy: user?.id || ''
        })
      );

      const donorAssignments = selectedDonorIds.map(donorId => {
        const donor = donors.find(d => d.id === donorId);
        return apiPost('/api/v1/entity-assignments', {
          userId: donor?.user.id,
          entityId: selectedEntity,
          assignedBy: user?.id || ''
        });
      });

      await Promise.all([...userAssignments, ...donorAssignments]);

      // Reset selections and refetch data
      setSelectedUserIds([]);
      setSelectedDonorIds([]);
      fetchData();
    } catch (error) {
      console.error('Error assigning users:', error);
    }
    setIsAssigning(false);
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      if (!token) throw new Error('No authentication token available');
      await apiDelete(`/api/v1/entity-assignments/${assignmentId}`);
      fetchData();
    } catch (error) {
      console.error('Error removing assignment:', error);
    }
  };

  // Filter users based on search and role filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.organization?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const userRoles = user.roles.map(r => r.role.name);
    const matchesRole = userRoles.some(role => roleFilters[role as keyof RoleFilter]);
    
    return matchesSearch && matchesRole && user.isActive;
  });

  // Filter donors based on search and role filter
  const filteredDonors = donors.filter(donor => {
    if (!roleFilters.DONOR) return false;
    
    const matchesSearch = !searchQuery || 
      donor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donor.organization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donor.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Get users not assigned to selected entity
  const getUnassignedUsers = () => {
    const assignedUserIds = assignments
      .filter(a => a.entityId === selectedEntity)
      .map(a => a.userId);
    
    return filteredUsers.filter(user => !assignedUserIds.includes(user.id));
  };

  // Get donors not assigned to selected entity
  const getUnassignedDonors = () => {
    const assignedUserIds = assignments
      .filter(a => a.entityId === selectedEntity)
      .map(a => a.userId);
    
    return filteredDonors.filter(donor => !assignedUserIds.includes(donor.user.id));
  };

  const getAssignmentsForEntity = (entityId: string) => {
    return assignments.filter(a => a.entityId === entityId);
  };

  const handleRoleFilterChange = (role: keyof RoleFilter, checked: boolean) => {
    setRoleFilters(prev => ({ ...prev, [role]: checked }));
  };

  const hasAnyRoleSelected = Object.values(roleFilters).some(Boolean);

  const getUserRoleBadge = (user: User) => {
    const roles = user.roles.map(r => r.role.name).filter(r => r in ROLE_CONFIG);
    if (roles.length === 0) return null;
    
    const primaryRole = roles[0] as keyof typeof ROLE_CONFIG;
    const config = ROLE_CONFIG[primaryRole];
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Entity Assignment Management</h1>
        <p className="text-muted-foreground">
          Assign users and donors to entities for coordinated disaster response
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assign">Assign Users/Donors</TabsTrigger>
          <TabsTrigger value="assignments">Manage Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="assign" className="space-y-6">
          {/* Entity Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Entity</CardTitle>
              <CardDescription>
                Choose the entity to assign users and donors to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{entity.name}</span>
                        <Badge variant="outline">{entity.type}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedEntity && (
            <>
              {/* Search and Role Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Search & Filter
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users and donors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Role Filters</Label>
                    <div className="flex flex-wrap gap-4">
                      {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                        <div key={role} className="flex items-center space-x-2">
                          <Checkbox
                            id={role}
                            checked={roleFilters[role as keyof RoleFilter]}
                            onCheckedChange={(checked) => 
                              handleRoleFilterChange(role as keyof RoleFilter, checked as boolean)
                            }
                          />
                          <Label htmlFor={role} className="flex items-center gap-2 cursor-pointer">
                            <config.icon className="h-4 w-4" />
                            <span>{config.label}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!hasAnyRoleSelected && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Please select at least one role type to display users.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* User and Donor Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Regular Users */}
                {(roleFilters.ASSESSOR || roleFilters.RESPONDER) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Assign Users
                      </CardTitle>
                      <CardDescription>
                        Select assessment and response personnel
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {getUnassignedUsers().length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">
                            No available users matching filters
                          </p>
                        ) : (
                          getUnassignedUsers().map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                            >
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={selectedUserIds.includes(user.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedUserIds([...selectedUserIds, user.id]);
                                  } else {
                                    setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                                  }
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`user-${user.id}`} className="font-medium cursor-pointer">
                                    {user.name}
                                  </Label>
                                  {getUserRoleBadge(user)}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {user.email}
                                </p>
                                {user.organization && (
                                  <p className="text-xs text-muted-foreground">
                                    {user.organization}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Donors */}
                {roleFilters.DONOR && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DonorIcon className="h-5 w-5" />
                        Assign Donors
                      </CardTitle>
                      <CardDescription>
                        Select donor organizations for entity coordination
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {getUnassignedDonors().length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">
                            No available donors matching filters
                          </p>
                        ) : (
                          getUnassignedDonors().map((donor) => (
                            <div
                              key={donor.id}
                              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                            >
                              <Checkbox
                                id={`donor-${donor.id}`}
                                checked={selectedDonorIds.includes(donor.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedDonorIds([...selectedDonorIds, donor.id]);
                                  } else {
                                    setSelectedDonorIds(selectedDonorIds.filter(id => id !== donor.id));
                                  }
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`donor-${donor.id}`} className="font-medium cursor-pointer">
                                    {donor.name}
                                  </Label>
                                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                                    Donor
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {donor.user.email}
                                </p>
                                {donor.organization && donor.organization !== donor.name && (
                                  <p className="text-xs text-muted-foreground">
                                    {donor.organization}
                                  </p>
                                )}
                                {donor.contactEmail && (
                                  <p className="text-xs text-muted-foreground">
                                    Contact: {donor.contactEmail}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Assignment Action */}
              {(selectedUserIds.length > 0 || selectedDonorIds.length > 0) && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Ready to Assign</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedUserIds.length} user(s) and {selectedDonorIds.length} donor(s) selected
                        </p>
                      </div>
                      <Button
                        onClick={assignUsersAndDonorsToEntity}
                        disabled={isAssigning}
                        className="flex items-center gap-2"
                      >
                        {isAssigning ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Assigning...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Assign to Entity
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          {entities.map((entity) => (
            <Card key={entity.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {entity.name}
                </CardTitle>
                <CardDescription>
                  <Badge variant="outline">{entity.type}</Badge>
                  {entity.location && <span className="ml-2">{entity.location}</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getAssignmentsForEntity(entity.id).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No users assigned to this entity
                    </p>
                  ) : (
                    getAssignmentsForEntity(entity.id).map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{assignment.user.name}</p>
                          <p className="text-sm text-muted-foreground">{assignment.user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeAssignment(assignment.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}