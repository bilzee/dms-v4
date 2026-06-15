'use client'

import { useState } from 'react'
import { useAdminDonors } from '@/hooks/useAdminDonors'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Users,
  Mail,
  Phone,
  Edit,
  Eye,
  ShieldCheck,
  CheckCircle
} from '@/lib/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable, type ColumnDef, type RowAction } from '@/components/shared/DataTable'

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
    responses?: number
  }
}

const getDonorTypeColor = (type: string) => {
  const colors = {
    ORGANIZATION: 'bg-blue-100 text-blue-800',
    INDIVIDUAL: 'bg-green-100 text-green-800',
    GOVERNMENT: 'bg-purple-100 text-purple-800',
    NGO: 'bg-orange-100 text-orange-800',
    CORPORATE: 'bg-gray-100 text-gray-800'
  }
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

const donorColumns: ColumnDef<Donor>[] = [
  {
    key: 'name',
    header: 'Donor',
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
      <Badge className={getDonorTypeColor(donor.type)}>
        {donor.type}
      </Badge>
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
      <Badge
        variant="outline"
        className={donor.isActive
          ? "bg-green-100 text-green-800 border-green-200"
          : "bg-yellow-100 text-yellow-800 border-yellow-200"}
      >
        {donor.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    key: 'lastActivity',
    header: 'Activity',
    render: (donor) => (
      <div className="text-sm">
        <p>{donor._count.commitments} commitments</p>
        <p>{donor._count.responses} responses</p>
      </div>
    ),
  },
]

export default function DonorManagementPage() {
  const { data: donorsData, isLoading: loading } = useAdminDonors()
  const donors: Donor[] = Array.isArray(donorsData?.items) ? donorsData.items : []
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  const donorActions: RowAction[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (donorId: string) => router.push(`/admin/donors/${donorId}`),
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (donorId: string) => router.push(`/admin/donors/${donorId}/edit`),
    },
  ]

  const [filter, setFilter] = useState<string>('all')

  const filteredDonors = (Array.isArray(donors) ? donors : []).filter(donor => {
    const matchesSearch = donor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donor.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donor.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filter === 'all' ||
                         (filter === 'active' && donor.isActive) ||
                         (filter === 'inactive' && !donor.isActive)

    return matchesSearch && matchesFilter
  })

  return (
    <RoleBasedRoute requiredRole="COORDINATOR" fallbackPath="/dashboard">
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
          <Link href="/register">
            <Button>
              <Building2 className="h-4 w-4 mr-2" />
              Add New Donor
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <StatCardGrid columns={4}>
        <StatCard label="Total Donors" value={donors.length} severity="info" icon={Building2} />
        <StatCard label="Active" value={donors.filter(d => d.isActive).length} severity="success" icon={ShieldCheck} />
        <StatCard label="Total Commitments" value={donors.reduce((sum, d) => sum + d._count.commitments, 0)} severity="info" icon={Users} />
        <StatCard label="Total Responses" value={donors.reduce((sum, d) => sum + (d._count.responses || 0), 0)} severity="info" icon={CheckCircle} />
      </StatCardGrid>

      <DataTable
        title="Donor Registry"
        description="Complete list of registered donor organizations and their contribution metrics"
        columns={donorColumns}
        data={filteredDonors}
        loading={loading}
        emptyMessage={searchTerm || filter !== 'all' ? 'No donors match your search criteria' : 'No donors have been registered yet'}
        searchable
        searchPlaceholder="Search by name, organization, or email..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          {
            key: 'status',
            label: 'Filter by status',
            options: [
              { label: `All (${donors.length})`, value: 'all' },
              { label: `Active (${donors.filter(d => d.isActive).length})`, value: 'active' },
              { label: `Inactive (${donors.filter(d => !d.isActive).length})`, value: 'inactive' },
            ],
          },
        ]}
        filterValues={{ status: filter }}
        onFilterChange={(key, value) => {
          if (key === 'status') setFilter(value)
        }}
        actions={donorActions}
      />
      </div>
    </RoleBasedRoute>
  )
}