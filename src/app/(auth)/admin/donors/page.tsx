'use client'

import { useState } from 'react'
import { useAdminDonors } from '@/hooks/useAdminDonors'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Building2, 
  Users, 
  Mail, 
  Phone, 
  Calendar,
  Search,
  Edit,
  Eye,
  Shield,
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

export default function DonorManagementPage() {
  const { data: donorsData, isLoading: loading } = useAdminDonors()
  const donors: Donor[] = Array.isArray(donorsData?.donors) ? donorsData.donors : []
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const filteredDonors = (Array.isArray(donors) ? donors : []).filter(donor => {
    const matchesSearch = donor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donor.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donor.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && donor.isActive) ||
                         (filter === 'inactive' && !donor.isActive)
    
    return matchesSearch && matchesFilter
  })

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Donors</p>
                <p className="text-2xl font-bold">{donors.length}</p>
              </div>
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {donors.filter(d => d.isActive).length}
                </p>
              </div>
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Commitments</p>
                <p className="text-2xl font-bold">
                  {donors.reduce((sum, d) => sum + d._count.commitments, 0)}
                </p>
              </div>
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Responses</p>
                <p className="text-2xl font-bold">
                  {donors.reduce((sum, d) => sum + d._count.responses, 0)}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Donors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, organization, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                All ({donors.length})
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                onClick={() => setFilter('active')}
              >
                Active ({donors.filter(d => d.isActive).length})
              </Button>
              <Button
                variant={filter === 'inactive' ? 'default' : 'outline'}
                onClick={() => setFilter('inactive')}
              >
                Inactive ({donors.filter(d => !d.isActive).length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Donor Registry</CardTitle>
          <CardDescription>
            Complete list of registered donor organizations and their contribution metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading donor data...</p>
            </div>
          ) : filteredDonors.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No donors found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filter !== 'all' 
                  ? 'No donors match your search criteria'
                  : 'No donors have been registered yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor Information</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonors.map((donor) => (
                  <TableRow key={donor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{donor.name}</p>
                        {donor.organization && (
                          <p className="text-sm text-muted-foreground">{donor.organization}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Since {new Date(donor.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDonorTypeColor(donor.type)}>
                        {donor.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{donor._count.commitments} commitments</p>
                        <p>{donor._count.responses} responses</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/donors/${donor.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/admin/donors/${donor.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </RoleBasedRoute>
  )
}