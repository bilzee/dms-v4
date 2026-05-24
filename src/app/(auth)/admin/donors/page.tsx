'use client'

import { useState } from 'react'
import { useAdminDonors } from '@/hooks/useAdminDonors'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button'
import { StatusBadge, getBadgeClasses } from '@/components/shared/StatusBadge'
import { DataTable, type ColumnDef, type RowAction } from '@/components/shared/DataTable'
import { 
  Building2, 
  Users, 
  Mail, 
  Phone, 
  Edit,
  Eye,
  ShieldCheck,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'

interface Donor {
  id: string
  name: string
  type: string
  contactEmail?: string
  contactPhone?: string
  organization?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    commitments: number
    responses: number
  }
}

const donorColumns: ColumnDef<Donor>[] = [
  {
    key: 'name',
    header: 'Donor Information',
    render: (donor) => (
      <div>
        <p className="font-medium">{donor.name}</p>
        {donor.organization && (
          <p className="text-sm text-muted-foreground">{donor.organization}</p>
        )}
        <p className="text-xs text-gray-500">
          Since {new Date(donor.createdAt).toLocaleDateString()}
        </p>
      </div>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    render: (donor) => (
      <StatusBadge
        status={donor.type}
        domain="donorType"
        size="sm"
      />
    ),
  },
  {
    key: 'contact',
    header: 'Contact',
    render: (donor) => (
      <div className="space-y-1">
        {donor.contactEmail && (
          <div className="flex items-center gap-1 text-sm">
            <Mail className="h-3 w-3 text-gray-400" />
            {donor.contactEmail}
          </div>
        )}
        {donor.contactPhone && (
          <div className="flex items-center gap-1 text-sm">
            <Phone className="h-3 w-3 text-gray-400" />
            {donor.contactPhone}
          </div>
        )}
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (donor) => (
      <div className="flex items-center gap-2">
        {donor.isActive ? (
          <>
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600">Active</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-yellow-600">Inactive</span>
          </>
        )}
      </div>
    ),
  },
  {
    key: 'activity',
    header: 'Activity',
    render: (donor) => (
      <div className="text-sm">
        <p>{donor._count.commitments} commitments</p>
        <p>{donor._count.responses} responses</p>
      </div>
    ),
  },
]

const donorActions: RowAction[] = [
  {
    label: 'View Details',
    icon: Eye,
    onClick: (donorId: string) => {
      window.location.href = `/admin/donors/${donorId}`
    },
  },
  {
    label: 'Edit Donor',
    icon: Edit,
    onClick: (donorId: string) => {
      window.location.href = `/admin/donors/${donorId}/edit`
    },
  },
]

export default function DonorManagementPage() {
  const { data: donorsData, isLoading: loading } = useAdminDonors()
  const donors: Donor[] = Array.isArray(donorsData?.items) ? donorsData.items : []
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredDonors = (Array.isArray(donors) ? donors : []).filter(donor => {
    const matchesSearch = donor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donor.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donor.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = statusFilter === 'all' || 
                         (statusFilter === 'active' && donor.isActive) ||
                         (statusFilter === 'inactive' && !donor.isActive)
    
    return matchesSearch && matchesFilter
  })

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'status') setStatusFilter(value)
  }

  const filterValues: Record<string, string> = {
    status: statusFilter,
  }

  const filterConfigs = [
    {
      key: 'status',
      label: 'Filter by status',
      options: [
        { label: 'All Donors', value: 'all' },
        { label: 'Active Only', value: 'active' },
        { label: 'Inactive Only', value: 'inactive' },
      ],
    },
  ]

  return (
    <RoleBasedRoute requiredRoles={['ADMIN', 'COORDINATOR']} fallbackPath="/dashboard">
      <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Donor Management</h1>
          <p className="text-muted-foreground">
            Manage donor organizations, view performance metrics, and monitor contributions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/admin/donors/register">
            <Button>
              <Building2 className="h-4 w-4 mr-2" />
              Register New Donor
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <StatCardGrid columns={4}>
        <StatCard label="Total Donors" value={donors.length} severity="info" icon={Building2} />
        <StatCard label="Active" value={donors.filter(d => d.isActive).length} severity="success" icon={ShieldCheck} />
        <StatCard label="Total Commitments" value={donors.reduce((sum, d) => sum + d._count.commitments, 0)} severity="info" icon={Users} />
        <StatCard label="Total Responses" value={donors.reduce((sum, d) => sum + d._count.responses, 0)} severity="info" icon={CheckCircle} />
      </StatCardGrid>

      <DataTable
        title="Donor Registry"
        description="Complete list of registered donor organizations and their contribution metrics"
        columns={donorColumns}
        data={filteredDonors}
        loading={loading}
        emptyMessage={donors.length === 0 ? "No donors have been registered yet." : "No donors match your search criteria."}
        searchable
        searchPlaceholder="Search by name, organization, or email..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filterConfigs}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        actions={donorActions}
      />
      </div>
    </RoleBasedRoute>
  )
}