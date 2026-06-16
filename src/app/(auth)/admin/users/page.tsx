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
import { FilterBar } from '@/components/shared/FilterBar'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { EditUserForm } from '@/components/auth/EditUserForm'
import { useAuth } from '@/hooks/useAuth'
import { useFilters } from '@/hooks/useFilters'
import { apiGet } from '@/lib/api'
import { Edit, Users, UserCheck, UserX, Plus, Pencil } from '@/lib/icons'
import { ExportButton } from '@/components/dashboards/shared/exports/ExportButton'
import { DataTable, type ColumnDef, type RowAction } from '@/components/shared/DataTable'
import type { AdminFilters, FilterConfig, ToolbarAction } from '@/types/filters'

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
    hideOnMobile: true,
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
    hideOnMobile: true,
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
  const { hasPermission } = useAuth()

  const canManageUsers = hasPermission('MANAGE_USERS')

  // Use the new useFilters hook for state management
  const {
    filters,
    setFilters,
    clearFilters,
    setFilterValue,
    summary
  } = useFilters<AdminFilters>({
    defaultFilters: {
      search: '',
      status: 'all',
      role: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    },
    enableUrlSync: true, // Enable URL synchronization
    persistKey: 'admin-users-filters', // Enable localStorage persistence
    debounceMs: 300
  })

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

  // Calculate metrics
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.isActive).length
  const inactiveUsers = users.filter(u => !u.isActive).length
  const availableRoles = [...new Set(users.flatMap(u => u.roles.map(r => r.role.name)))]

  // Configure filter options based on available data
  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Filter by status',
      placeholder: 'All Status',
      options: [
        { label: 'All Users', value: 'all' },
        { label: 'Active Only', value: 'active' },
        { label: 'Inactive Only', value: 'inactive' },
      ],
    },
    {
      key: 'role',
      label: 'Filter by role',
      placeholder: 'All Roles',
      options: [
        { label: 'All Roles', value: 'all' },
        ...availableRoles.map(role => ({ label: role, value: role })),
      ],
    },
  ]

  // Define toolbar actions
  const toolbarActions: ToolbarAction[] = [
    {
      label: 'Create User',
      icon: Plus,
      variant: 'default',
      onClick: () => setCreateDialogOpen(true),
    }
  ]

  const actionsWithHandler = userActions.map(action => ({
    ...action,
    onClick: handleEditUser,
  }))

  // Apply filters to users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !filters.search || 
      user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.username.toLowerCase().includes(filters.search.toLowerCase())

    const matchesStatus = filters.status === 'all' ||
      (filters.status === 'active' && user.isActive) ||
      (filters.status === 'inactive' && !user.isActive)

    const matchesRole = filters.role === 'all' ||
      user.roles.some(userRole => userRole.role.name === filters.role)

    return matchesSearch && matchesStatus && matchesRole
  })

  // Sort filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const direction = filters.sortOrder === 'desc' ? -1 : 1;
    
    switch (filters.sortBy) {
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'email':
        return direction * a.email.localeCompare(b.email);
      case 'createdAt':
        return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default:
        return 0;
    }
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
              <p className="text-gray-600 hidden sm:block">Manage system users and their role assignments</p>
            </div>
            
            <div className="flex items-center gap-3">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="sm:mr-2 h-5 w-5" />
                  <span className="hidden sm:inline">Create User</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <RegisterForm onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
            <ExportButton dataType="assessments" size="sm" />
            </div>
          </div>

          {/* Summary Tiles */}
          <StatCardGrid columns={3}>
            <StatCard label="Total Users" value={totalUsers} severity="info" icon={Users} />
            <StatCard label="Active Users" value={activeUsers} severity="success" icon={UserCheck} />
            <StatCard label="Inactive Users" value={inactiveUsers} severity="warning" icon={UserX} />
          </StatCardGrid>

          {/* NEW: Enhanced FilterBar with all features */}
          <FilterBar
            searchValue={filters.search}
            onSearchChange={(value) => setFilterValue('search', value)}
            searchPlaceholder="Search users by name, email, or username..."
            
            filters={filterConfigs}
            filterValues={{
              status: filters.status || 'all',
              role: filters.role || 'all'
            }}
            onFilterChange={(key, value) => setFilterValue(key, value)}
            
            actions={toolbarActions}
            showClearAll={true}
            onClearAll={clearFilters}
            
            summary={summary}
            loading={!isHydrated || loading}
          />

          {/* Data Table - simplified since filtering moved to FilterBar */}
          <DataTable
            title="Users"
            columns={userColumns}
            data={isHydrated ? sortedUsers : []}
            loading={!isHydrated || loading}
            emptyMessage={users.length === 0 ? "No users found. Create your first user to get started." : "No users match the current filters."}
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