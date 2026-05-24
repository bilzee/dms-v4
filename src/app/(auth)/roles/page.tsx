'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef, type RowAction } from '@/components/shared/DataList'
import { useAuth } from '@/hooks/useAuth'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { Edit, Plus, Trash2, Shield, Key, Users } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const roleColumns: ColumnDef<Role>[] = [
  { key: 'name', header: 'Role', render: (role) => <span className="font-medium">{role.name}</span> },
  { key: 'description', header: 'Description' },
  {
    key: 'permissions',
    header: 'Permissions',
    render: (role) => (
      <div className="flex flex-wrap gap-1">
        {role.permissions.slice(0, 3).map((rp) => (
          <Badge key={rp.permission.id} variant="outline" className="text-xs">
            {rp.permission.name}
          </Badge>
        ))}
        {role.permissions.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{role.permissions.length - 3} more
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: 'users',
    header: 'Users',
    render: (role) => role.userRoles?.length || 0,
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (role) => new Date(role.createdAt).toLocaleDateString(),
  },
]

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const { hasPermission } = useAuth()
  const { toast } = useToast()

  
  // Fetch roles and permissions from backend
  const fetchRoles = async () => {
    try {
      setLoading(true)
      const result = await apiGet('/api/v1/roles')
      if (result.success) {
        setRoles(result.data?.roles || [])
        setPermissions(result.data?.permissions || [])
      } else {
        console.error('Error fetching roles:', result.error)
        setRoles([])
        setPermissions([])
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
    if (hasPermission('MANAGE_USERS')) {
      fetchRoles()
    }
  }, [hasPermission])

  return (
    <div className="py-8 space-y-6">
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
          <StatCardGrid columns={4}>
            <StatCard
              label="Total Roles"
              value={roles.length}
              severity="info"
              icon={Shield}
            />
            <StatCard
              label="Active Roles"
              value={roles.filter(r => r.userRoles && r.userRoles.length > 0).length}
              severity="success"
              icon={Users}
            />
            <StatCard
              label="Total Permissions"
              value={permissions.length}
              severity="neutral"
              icon={Key}
            />
            <StatCard
              label="Total Users"
              value={roles.reduce((sum, role) => sum + (role.userRoles?.length || 0), 0)}
              severity="info"
              icon={Users}
            />
          </StatCardGrid>

          {/* Roles Table */}
          <DataTable
            title="System Roles"
            columns={roleColumns}
            data={roles}
            loading={!isHydrated || loading}
            emptyMessage="No roles found. Create your first role to get started."
            actions={[
              {
                label: 'Edit Role',
                onClick: handleEditRole,
                icon: Edit,
              },
              {
                label: 'Delete Role',
                onClick: (roleId: string) => {
                  const role = roles.find(r => r.id === roleId)
                  if (role) {
                    setRoleToDelete(role)
                    setDeleteConfirmOpen(true)
                  }
                },
                icon: Trash2,
                variant: 'destructive',
              },
            ]}
          />

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Role</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete the role <strong>{roleToDelete?.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!roleToDelete) return
                    try {
                      const res = await apiDelete(`/api/v1/roles/${roleToDelete.id}`)
                      if (res.success) {
                        setDeleteConfirmOpen(false)
                        setRoleToDelete(null)
                        fetchRoles()
                      } else {
                        toast({ title: 'Error', description: res.error || 'Failed to delete role', variant: 'destructive' })
                      }
                    } catch {
                      toast({ title: 'Error', description: 'Failed to delete role', variant: 'destructive' })
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>

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
  const { toast } = useToast()
  // Fetch permissions for the form
  React.useEffect(() => {
    apiGet('/api/v1/permissions')
      .then(result => {
        if (result.success && result.data?.permissions) {
          setPermissions(result.data.permissions)
        }
      })
      .catch(error => {
        console.error('Error fetching permissions:', error)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        name: name.toUpperCase(),
        description,
        permissions: selectedPermissions
      }

      const result = role
        ? await apiPut(`/api/v1/roles/${role.id}`, payload)
        : await apiPost('/api/v1/roles', payload)

      if (result.success) {
        onSuccess()
      } else {
        throw new Error(result.error || 'Failed to save role')
      }
    } catch (error) {
      console.error('Error saving role:', error)
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save role', variant: 'destructive' })
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
                    <Checkbox
                      id={permission.code}
                      checked={selectedPermissions.includes(permission.code)}
                      onCheckedChange={() => togglePermission(permission.code)}
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