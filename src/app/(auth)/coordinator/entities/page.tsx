'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
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
import { Search, Users, MapPin, UserPlus, Trash2, Loader2, CheckCircle, UserCheck, AlertTriangle, Shield, User } from 'lucide-react';

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
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
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
        const entityData = entitiesResult.data?.data || entitiesResult.data;
        setEntities(Array.isArray(entityData) ? entityData : (entityData?.items || []));
      }

      if (usersResult.success) {
        const userData = usersResult.data?.data || usersResult.data;
        setUsers(Array.isArray(userData) ? userData : []);
      }

      if (assignmentsResult.success) {
        const assignmentData = assignmentsResult.data?.data || assignmentsResult.data;
        setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setIsLoading(false);
  }, []);

  const assignUsersToEntity = async () => {
    if (!selectedEntity || selectedUserIds.length === 0) return;

    setIsAssigning(true);
    try {
      // Create assignments for each selected user
      const assignmentPromises = selectedUserIds.map(userId =>
        apiPost('/api/v1/entity-assignments', {
          userId,
          entityId: selectedEntity,
          assignedBy: (user as any)?.id
        })
      );

      const results = await Promise.all(assignmentPromises);
      const failedAssignments = results.filter(res => !res.success);
      
      if (failedAssignments.length === 0) {
        setSelectedUserIds([]);
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

  // Handle checkbox selection
  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds([...selectedUserIds, userId]);
    } else {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    }
  };

  // Select/deselect all unassigned users
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const unassignedUserIds = getUnassignedUsers().map(user => user.id);
      setSelectedUserIds(unassignedUserIds);
    } else {
      setSelectedUserIds([]);
    }
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
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entities.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignable Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
        </div>

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
                setSelectedUserIds([]);
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Assign Users to Entity</h3>
                    {selectedEntity && (
                      <Button 
                        onClick={assignUsersToEntity}
                        disabled={selectedUserIds.length === 0 || isAssigning}
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
                            Assign Selected ({selectedUserIds.length})
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {!selectedEntity ? (
                    <div className="text-center p-8 text-muted-foreground">
                      Please select an entity above to view assignable users
                    </div>
                  ) : (
                    <>
                      {/* User Filters */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="search">Search Users</Label>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="search"
                              placeholder="Search by name or email..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="role">Filter by Role</Label>
                          <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="All roles" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All roles</SelectItem>
                              <SelectItem value="ASSESSOR">Assessor</SelectItem>
                              <SelectItem value="RESPONDER">Responder</SelectItem>
                              <SelectItem value="DONOR">Donor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-end">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setSearchQuery('');
                              setRoleFilter('ALL');
                            }}
                            className="w-full"
                          >
                            Clear Filters
                          </Button>
                        </div>
                      </div>

                      {/* Select All Checkbox */}
                      <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
                        <Checkbox
                          checked={getUnassignedUsers().length > 0 && selectedUserIds.length === getUnassignedUsers().length}
                          onCheckedChange={handleSelectAll}
                        />
                        <label className="text-sm font-medium">
                          Select All ({getUnassignedUsers().length} users)
                        </label>
                      </div>

                      {/* User List */}
                      {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <span className="ml-2">Loading users...</span>
                        </div>
                      ) : getUnassignedUsers().length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                          No unassigned users found for this entity
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {getUnassignedUsers().map((user) => (
                            <div key={user.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                              <Checkbox
                                checked={selectedUserIds.includes(user.id)}
                                onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    {getUserRoles(user).map((role) => (
                                      <Badge key={role.role.id} variant="secondary" className="text-xs">
                                        {role.role.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                  ) : isLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading assigned users...</span>
                    </div>
                  ) : getAssignedUsers().length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      No users assigned to this entity yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getAssignedUsers().map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{user.name}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {users.find(u => u.id === user.id)?.roles
                                  .filter(role => ['ASSESSOR', 'RESPONDER', 'DONOR'].includes(role.role.name))
                                  .map((role) => (
                                    <Badge key={role.role.id} variant="secondary" className="text-xs">
                                      {role.role.name}
                                    </Badge>
                                  ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(user.assignedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteAssignment(user.assignmentId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              {/* Current Assignments Tab */}
              <TabsContent value="all" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">All Entity Assignments</h3>
                  
                  {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading assignments...</span>
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      No assignments found. Use the &quot;Assign Users&quot; tab to create assignments.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Entity Type</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{assignment.user.name}</span>
                                <span className="text-xs text-muted-foreground">{assignment.user.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{assignment.entity.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{assignment.entity.type}</Badge>
                            </TableCell>
                            <TableCell>{assignment.entity.location || 'N/A'}</TableCell>
                            <TableCell>
                              {new Date(assignment.assignedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteAssignment(assignment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
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
              <User className="h-4 w-4" />
              You need to select the <strong>Coordinator</strong> role to access this page.
            </AlertDescription>
          </Alert>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-blue-600" />
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