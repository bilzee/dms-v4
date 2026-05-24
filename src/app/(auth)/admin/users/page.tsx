'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { EditUserForm } from '@/components/auth/EditUserForm'
import { useAuth } from '@/hooks/useAuth'
import { apiGet } from '@/lib/api'
import { Edit, Users, UserCheck, UserX, Plus, Pencil } from 'lucide-react'
import { DataTable, type ColumnDef, type RowAction } from '@/components/shared/DataTable'

interface User {
  id: string
  name: string
  email: string
  username: string
  isActive: boolean
  roles: Array<{
    role: {
      id: string
      name: string
    }
  }>
  createdAt: string
}

const userColumns: ColumnDef<User>[] = [
  {
    key: 'name',
    header: 'User',
    render: (user) => <span className="font-medium">{user.name}</span>,
  },
  {
    key: 'email',
    header: 'Email',
    render: (user) => <span className="text-muted-foreground">{user.email}</span>,
  },
  {
    key: 'roles',
    header: 'Role',
    render: (user) => (
      <div className="flex flex-wrap gap-1">
        {user.roles.map((userRole) => (
          <StatusBadge
            key={userRole.role.id}
            status={userRole.role.name}
            domain="role"
            size="sm"
          />
        ))}
      </div>
    ),
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (user) => (
      <Badge
        variant="outline"
        className={user.isActive
          ? "bg-green-100 text-green-800 border-green-200"
          : "bg-red-100 text-red-800 border-red-200"}
      >
        {user.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    key: 'createdAt',
    header: 'Joined',
    render: (user) => new Date(user.createdAt).toLocaleDateString(),
  },
]

const userActions: RowAction[] = [
  {
    label: 'Edit User',
    icon: Pencil,
    onClick: () => {},
  },
]

export default function UsersPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const { hasPermission } = useAuth()

  const canManageUsers = hasPermission('MANAGE_USERS')

  // Fetch users from backend via TanStack Query
  const { data: users = [], isLoading: loading, refetch: fetchUsers } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/users')
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch users')
      }
      return result.data?.items || []
    },
    enabled: canManageUsers,
    staleTime: 60000,
  })

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false)
    fetchUsers() // Refresh the list
  }

  const handleEditSuccess = () => {
    setEditDialogOpen(false)
    setSelectedUser(null)
    fetchUsers() // Refresh the list
  }

  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setSelectedUser(user)
      setEditDialogOpen(true)
    }
  }

  const totalUsers = users.length
  const activeUsers = users.filter(u => u.isActive).length
  const inactiveUsers = users.filter(u => !u.isActive).length
  const availableRoles = [...new Set(users.flatMap(u => u.roles.map(r => r.role.name)))]

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') setStatusFilter(value)
    if (key === 'role') setRoleFilter(value)
  }

  const filterValues: Record<string, string> = {
    status: statusFilter,
    role: roleFilter,
  }

  const filterConfigs = [
    {
      key: 'status',
      label: 'Filter by status',
      options: [
        { label: 'All Users', value: 'all' },
        { label: 'Active Only', value: 'active' },
        { label: 'Inactive Only', value: 'inactive' },
      ],
    },
    {
      key: 'role',
      label: 'Filter by role',
      options: [
        { label: 'All Roles', value: 'all' },
        ...availableRoles.map(role => ({ label: role, value: role })),
      ],
    },
  ]

  const actionsWithHandler = userActions.map(action => ({
    ...action,
    onClick: handleEditUser,
  }))

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && user.isActive) ||
                         (statusFilter === 'inactive' && !user.isActive)

    const matchesRole = roleFilter === 'all' ||
                       user.roles.some(userRole => userRole.role.name === roleFilter)

    return matchesSearch && matchesStatus && matchesRole
  })

  // Prevent hydration mismatch by waiting for client-side hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Main render - all hooks called before any conditional logic
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Permission check - conditional rendering, not conditional hooks */}
      {!hasPermission('MANAGE_USERS') ? (
        <Alert variant="destructive">
          <AlertDescription>
            You don&apos;t have permission to access user management.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-gray-600">Manage system users and their role assignments</p>
            </div>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-5 w-5" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <RegisterForm onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Tiles */}
          <StatCardGrid columns={3}>
            <StatCard label="Total Users" value={totalUsers} severity="info" icon={Users} />
            <StatCard label="Active Users" value={activeUsers} severity="success" icon={UserCheck} />
            <StatCard label="Inactive Users" value={inactiveUsers} severity="warning" icon={UserX} />
          </StatCardGrid>

          <DataTable
            title="Users"
            columns={userColumns}
            data={isHydrated ? filteredUsers : []}
            loading={!isHydrated || loading}
            emptyMessage={users.length === 0 ? "No users found. Create your first user to get started." : "No users match the current filters."}
            searchable
            searchPlaceholder="Search users by name, email, or username..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            filters={filterConfigs}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            actions={actionsWithHandler}
          />

          {/* Edit User Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              {selectedUser && (
                <EditUserForm 
                  user={selectedUser}
                  isAdmin={true}
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