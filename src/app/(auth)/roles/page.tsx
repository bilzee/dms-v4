'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { Edit, Plus, Trash2, Shield, Key, Users } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface Role {
  id: string
  name: string
  description: string
  permissions: Array<{
    permission: {
      id: string
      name: string
      code: string
      category: string
      description: string
    }
  }>
  userRoles?: Array<{
    userId: string
  }>
  createdAt: string
}

interface Permission {
  id: string
  name: string
  code: string
  description: string
  category: string
}

export default function RolesPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const { hasPermission, token } = useAuth()

  
  // Fetch roles and permissions from backend
  const fetchRoles = async () => {
    if (!token) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/v1/roles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRoles(data.data.roles || [])
        setPermissions(data.data.permissions || [])
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
      setRoles([])
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false)
    fetchRoles()
  }

  const handleEditSuccess = () => {
    setEditDialogOpen(false)
    setSelectedRole(null)
    fetchRoles()
  }

  const handleEditRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (role) {
      setSelectedRole(role)
      setEditDialogOpen(true)
    }
  }

  // Prevent hydration mismatch
  React.useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Fetch roles on component mount
  React.useEffect(() => {
    if (token && hasPermission('MANAGE_USERS')) {
      fetchRoles()
    }
  }, [token, hasPermission])

  return (
    <div className="container mx-auto py-8 space-y-6">
      {!hasPermission('MANAGE_USERS') ? (
        <Alert variant="destructive">
          <AlertDescription>
            You don&apos;t have permission to access role management.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Role Management</h1>
              <p className="text-gray-600">Manage system roles and permissions</p>
            </div>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                </DialogHeader>
                <RoleForm onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Role Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Roles</p>
                    <p className="text-2xl font-bold">{roles.length}</p>
                  </div>
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Roles</p>
                    <p className="text-2xl font-bold">{roles.filter(r => r.userRoles && r.userRoles.length > 0).length}</p>
                  </div>
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Permissions</p>
                    <p className="text-2xl font-bold">{permissions.length}</p>
                  </div>
                  <Key className="h-6 w-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold">{roles.reduce((sum, role) => sum + (role.userRoles?.length || 0), 0)}</p>
                  </div>
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Roles Table */}
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
            </CardHeader>
            <CardContent>
              {!isHydrated ? (
                <div className="space-y-2">
                  <div className="animate-pulse">
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : loading ? (
                <div className="space-y-2">
                  <div className="animate-pulse">
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No roles found. Create your first role to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.slice(0, 3).map((rolePermission) => (
                              <Badge key={rolePermission.permission.id} variant="outline" className="text-xs">
                                {rolePermission.permission.name}
                              </Badge>
                            ))}
                            {role.permissions.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{role.permissions.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{role.userRoles?.length || 0}</TableCell>
                        <TableCell>{new Date(role.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditRole(role.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this role?')) {
                                    try {
                                      const res = await fetch(`/api/v1/roles/${role.id}`, {
                                        method: 'DELETE',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                      })
                                      if (res.ok) {
                                        fetchRoles()
                                      } else {
                                        const data = await res.json()
                                        alert(data.error || 'Failed to delete role')
                                      }
                                    } catch { alert('Failed to delete role') }
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Role
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit Role Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Role</DialogTitle>
              </DialogHeader>
              {selectedRole && (
                <RoleForm 
                  role={selectedRole}
                  onSuccess={handleEditSuccess}
                  onCancel={() => setEditDialogOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

// Role Form Component
interface RoleFormProps {
  role?: Role
  onSuccess: () => void
  onCancel?: () => void
}

function RoleForm({ role, onSuccess, onCancel }: RoleFormProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [name, setName] = useState(role?.name || '')
  const [description, setDescription] = useState(role?.description || '')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role?.permissions?.map(rp => rp.permission.code) || []
  )
  const [isLoading, setIsLoading] = useState(false)
  const { token } = useAuth()

  // Fetch permissions for the form
  React.useEffect(() => {
    if (token) {
      fetch('/api/v1/permissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.data?.permissions) {
          setPermissions(data.data.permissions)
        }
      })
      .catch(error => {
        console.error('Error fetching permissions:', error)
      })
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/v1/roles' + (role ? `/${role.id}` : ''), {
        method: role ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.toUpperCase(),
          description,
          permissions: selectedPermissions
        })
      })

      if (response.ok) {
        onSuccess()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save role')
      }
    } catch (error) {
      console.error('Error saving role:', error)
      alert(error instanceof Error ? error.message : 'Failed to save role')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePermission = (permissionCode: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionCode)
        ? prev.filter(p => p !== permissionCode)
        : [...prev, permissionCode]
    )
  }

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const group = permission.category || 'General'
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Role Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., COORDINATOR"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this role can do..."
            rows={3}
          />
        </div>
      </div>

      <div>
        <Label>Permissions</Label>
        <div className="mt-2 space-y-4 max-h-60 overflow-y-auto border rounded-lg p-4">
          {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
            <div key={module} className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">{module}</h4>
              <div className="grid grid-cols-1 gap-2">
                {modulePermissions.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={permission.code}
                      checked={selectedPermissions.includes(permission.code)}
                      onChange={() => togglePermission(permission.code)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={permission.code} className="text-sm">
                      <span className="font-medium">{permission.name}</span>
                      <span className="text-gray-500 ml-1">- {permission.description}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (role ? 'Update Role' : 'Create Role')}
        </Button>
      </div>
    </form>
  )
}