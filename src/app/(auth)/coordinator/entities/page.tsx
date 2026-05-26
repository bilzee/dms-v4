'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, apiDelete, extractArray } from '@/lib/api';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataTable, type ColumnDef, type RowAction } from '@/components/shared/DataTable';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardGrid } from '@/components/shared/StatCardGrid';
import { Users, MapPin, UserPlus, Trash2, Loader2, CheckCircle, AlertTriangle, Shield, User as UserIcon } from '@/lib/icons';
import { ExportButton } from '@/components/dashboards/shared/exports/ExportButton';

interface Entity {
  id: string;
  name: string;
  type: string;
  location: string | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  organization: string;
  roles: Array<{
    role: {
      id: string;
      name: string;
      description: string;
    }
  }>;
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

function CoordinatorEntitiesPageContent() {
  const { currentRole, user } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('assign');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [entitiesResult, usersResult, assignmentsResult] = await Promise.all([
        apiGet('/api/v1/entities'),
        apiGet('/api/v1/users/assignable'),
        apiGet('/api/v1/entity-assignments')
      ]);

      if (entitiesResult.success) {
        setEntities(extractArray(entitiesResult.data));
      }

      if (usersResult.success) {
        setUsers(extractArray(usersResult.data));
      }

      if (assignmentsResult.success) {
        setAssignments(extractArray(assignmentsResult.data));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setIsLoading(false);
  }, []);

  const assignUsersToEntity = async () => {
    if (!selectedEntity || selectedUserIds.size === 0) return;

    setIsAssigning(true);
    try {
      // Create assignments for each selected user
      const assignmentPromises = Array.from(selectedUserIds).map(userId =>
        apiPost('/api/v1/entity-assignments', {
          userId,
          entityId: selectedEntity,
          assignedBy: (user as any)?.id
        })
      );

      const results = await Promise.all(assignmentPromises);
      const failedAssignments = results.filter(res => !res.success);

      if (failedAssignments.length === 0) {
        setSelectedUserIds(new Set());
        await fetchData(); // Refresh assignments
        alert(`Successfully assigned ${results.length} user(s) to entity`);
      } else {
        alert(`${failedAssignments.length} assignment(s) failed. Check for existing assignments.`);
        await fetchData(); // Refresh to show current state
      }
    } catch (error) {
      console.error('Error creating assignments:', error);
      alert('Failed to create assignments');
    }
    setIsAssigning(false);
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      const result = await apiDelete(`/api/v1/entity-assignments/${assignmentId}`);

      if (result.success) {
        await fetchData(); // Refresh assignments
      } else {
        alert(result.error || 'Failed to delete assignment');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment');
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === '' || roleFilter === 'ALL' || 
      user.roles.some(role => role.role.name === roleFilter);
    
    return matchesSearch && matchesRole;
  });

  const getUserRoles = (user: User) => {
    return user.roles.filter(role => ['ASSESSOR', 'RESPONDER', 'DONOR'].includes(role.role.name));
  };

  // Get users not assigned to selected entity
  const getUnassignedUsers = () => {
    if (!selectedEntity) return filteredUsers;
    
    const assignedUserIds = assignments
      .filter(assignment => assignment.entityId === selectedEntity)
      .map(assignment => assignment.userId);
    
    return filteredUsers.filter(user => !assignedUserIds.includes(user.id));
  };

  // Get users assigned to selected entity
  const getAssignedUsers = () => {
    if (!selectedEntity) return [];
    
    return assignments
      .filter(assignment => assignment.entityId === selectedEntity)
      .map(assignment => ({
        ...assignment.user,
        assignmentId: assignment.id,
        assignedAt: assignment.assignedAt
      }));
  };

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Entity Assignment Management</h2>
            <p className="text-muted-foreground">
              Assign entities to assessors, responders, and donors for role-based access control
            </p>
          </div>
          <ExportButton dataType="entities" size="sm" />
        </div>

        {/* Statistics */}
        <StatCardGrid columns={3}>
          <StatCard label="Total Entities" value={entities.length} severity="info" icon={MapPin} />
          <StatCard label="Assignable Users" value={users.length} severity="info" icon={Users} />
          <StatCard label="Active Assignments" value={assignments.length} severity="success" icon={CheckCircle} />
        </StatCardGrid>

        {/* Entity Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Entity</CardTitle>
            <CardDescription>
              Choose an entity to manage user assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="entity">Entity</Label>
              <Select value={selectedEntity} onValueChange={(value) => {
                setSelectedEntity(value);
                setSelectedUserIds(new Set());
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an entity..." />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{entity.type}</Badge>
                        {entity.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="assign">Assign Users</TabsTrigger>
                <TabsTrigger value="assigned">Assigned Users</TabsTrigger>
                <TabsTrigger value="all">Current Assignments</TabsTrigger>
              </TabsList>

              {/* Assign Users Tab */}
              <TabsContent value="assign" className="p-6">
                <div className="space-y-4">
                  {!selectedEntity ? (
                    <div className="text-center p-8 text-muted-foreground">
                      Please select an entity above to view assignable users
                    </div>
                  ) : (
                    <>
                      {/* Selection Action Bar */}
                      {selectedUserIds.size > 0 && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <span className="text-sm font-medium text-blue-800">
                            {selectedUserIds.size} user(s) selected
                          </span>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedUserIds(new Set())}>
                              Clear Selection
                            </Button>
                            <Button size="sm" onClick={assignUsersToEntity} disabled={isAssigning}>
                              {isAssigning ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-1" />Assigning...</>
                              ) : (
                                <><UserPlus className="h-4 w-4 mr-1" />Assign Selected</>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      <DataTable
                        title="Assign Users to Entity"
                        description={`${getUnassignedUsers().length} users available for assignment`}
                        data={getUnassignedUsers().map(u => ({ ...u, id: u.id }))}
                        loading={isLoading}
                        emptyMessage="No unassigned users found for this entity"
                        emptyType="search"
                        searchable
                        searchPlaceholder="Search by name or email..."
                        searchValue={searchQuery}
                        onSearchChange={setSearchQuery}
                        filters={[{
                          key: 'role',
                          label: 'Filter by Role',
                          options: [
                            { label: 'All Roles', value: 'ALL' },
                            { label: 'Assessor', value: 'ASSESSOR' },
                            { label: 'Responder', value: 'RESPONDER' },
                            { label: 'Donor', value: 'DONOR' },
                          ]
                        }]}
                        filterValues={{ role: roleFilter }}
                        onFilterChange={(key, value) => { if (key === 'role') setRoleFilter(value); }}
                        selectable
                        selectedIds={selectedUserIds}
                        onSelectionChange={setSelectedUserIds}
                        headerActions={
                          selectedUserIds.size > 0 ? (
                            <Button
                              onClick={assignUsersToEntity}
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
                                  Assign Selected ({selectedUserIds.size})
                                </>
                              )}
                            </Button>
                          ) : undefined
                        }
                        columns={[
                          {
                            key: 'name',
                            header: 'User',
                            render: (user: any) => (
                              <div className="flex flex-col">
                                <span className="font-medium">{user.name}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            ),
                          },
                          {
                            key: 'roles',
                            header: 'Roles',
                            render: (user: any) => (
                              <div className="flex gap-1">
                                {getUserRoles(user).map((role) => (
                                  <Badge key={role.role.id} variant="secondary" className="text-xs">
                                    {role.role.name}
                                  </Badge>
                                ))}
                              </div>
                            ),
                          },
                          {
                            key: 'organization',
                            header: 'Organization',
                            render: (user: any) => user.organization || 'N/A',
                          },
                        ]}
                      />
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Assigned Users Tab */}
              <TabsContent value="assigned" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Users Assigned to Entity</h3>
                  
                  {!selectedEntity ? (
                    <div className="text-center p-8 text-muted-foreground">
                      Please select an entity above to view assigned users
                    </div>
                  ) : (
                    <DataTable
                      data={getAssignedUsers().map(u => ({ ...u, id: u.assignmentId }))}
                      loading={isLoading}
                      emptyMessage="No users assigned to this entity yet"
                      columns={[
                        {
                          key: 'name',
                          header: 'User',
                          render: (user: any) => (
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          ),
                        },
                        {
                          key: 'roles',
                          header: 'Roles',
                          render: (user: any) => (
                            <div className="flex gap-1">
                              {users.find(u => u.id === user.id)?.roles
                                .filter(role => ['ASSESSOR', 'RESPONDER', 'DONOR'].includes(role.role.name))
                                .map((role) => (
                                  <Badge key={role.role.id} variant="secondary" className="text-xs">
                                    {role.role.name}
                                  </Badge>
                                ))}
                            </div>
                          ),
                        },
                        {
                          key: 'assignedAt',
                          header: 'Assigned Date',
                          render: (user: any) => new Date(user.assignedAt).toLocaleDateString(),
                        },
                      ]}
                      actions={[
                        {
                          label: 'Remove',
                          onClick: (assignmentId: string) => deleteAssignment(assignmentId),
                          icon: Trash2,
                          variant: 'destructive',
                        },
                      ]}
                    />
                  )}
                </div>
              </TabsContent>

              {/* Current Assignments Tab */}
              <TabsContent value="all" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">All Entity Assignments</h3>
                  
                  <DataTable
                    data={assignments}
                    loading={isLoading}
                    emptyMessage={'No assignments found. Use the "Assign Users" tab to create assignments.'}
                    columns={[
                      {
                        key: 'user.name',
                        header: 'User',
                        render: (assignment: any) => (
                          <div className="flex flex-col">
                            <span className="font-medium">{assignment.user.name}</span>
                            <span className="text-xs text-muted-foreground">{assignment.user.email}</span>
                          </div>
                        ),
                      },
                      {
                        key: 'entity.name',
                        header: 'Entity',
                        render: (assignment: any) => (
                          <span className="font-medium">{assignment.entity.name}</span>
                        ),
                      },
                      {
                        key: 'entity.type',
                        header: 'Entity Type',
                        render: (assignment: any) => (
                          <Badge variant="outline">{assignment.entity.type}</Badge>
                        ),
                      },
                      {
                        key: 'entity.location',
                        header: 'Location',
                        render: (assignment: any) => assignment.entity.location || 'N/A',
                      },
                      {
                        key: 'assignedAt',
                        header: 'Assigned',
                        render: (assignment: any) => new Date(assignment.assignedAt).toLocaleDateString(),
                      },
                    ]}
                    actions={[
                      {
                        label: 'Remove',
                        onClick: (assignmentId: string) => deleteAssignment(assignmentId),
                        icon: Trash2,
                        variant: 'destructive',
                      },
                    ]}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CoordinatorEntitiesPage() {
  const { availableRoles } = useAuth();

  // Custom error message for multi-role users who haven't selected COORDINATOR role
  const RoleAccessError = () => {
    const hasCoordinatorRole = availableRoles.includes('COORDINATOR');
    
    if (!hasCoordinatorRole) {
      return (
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="p-6">
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  You do not have permission to access this page. Coordinator role is required to manage entity assignments.
                </AlertDescription>
              </Alert>
              <div className="text-center text-muted-foreground">
                Only coordinators can assign entities to users for role-based access control.
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              You need to select the <strong>Coordinator</strong> role to access this page.
            </AlertDescription>
          </Alert>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Role Selection Required
              </h3>
              <p className="text-blue-700 mb-4">
                You have the Coordinator role assigned, but you need to actively select it to manage entity assignments.
              </p>
              <p className="text-sm text-blue-600 mb-6">
                Switch to the Coordinator role using the role selector in the top-right corner of the page.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Refresh Page After Selecting Role
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <RoleBasedRoute 
      requiredRole="COORDINATOR" 
      fallbackPath="/dashboard"
      errorComponent={<RoleAccessError />}
    >
      <CoordinatorEntitiesPageContent />
    </RoleBasedRoute>
  );
}