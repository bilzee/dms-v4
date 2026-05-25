'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { useAdminDonorDetail } from '@/hooks/useAdminDonorDetail'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ContentSkeleton } from '@/components/shared/ContentSkeleton'
import { 
  Building2, 
  User,
  Mail, 
  Phone, 
  Calendar,
  ArrowLeft,
  Edit,
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Users,
  HandHeart,
  Package,
  Activity
} from '@/lib/icons'

interface DonorDetails {
  id: string
  name: string
  type: string
  contactEmail?: string
  contactPhone?: string
  organization?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    email: string
    name: string
    organization?: string
    isActive: boolean
    isLocked: boolean
    createdAt: string
  } | null
  _count: {
    commitments: number
    responses: number
    entityAssignments: number
  }
}

export default function DonorDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const donorId = params.id as string

  const { data: donor, isLoading: loading, error: queryError } = useAdminDonorDetail(donorId)
  const error = queryError ? queryError.message : null

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

  if (loading) {
    return (
      <RoleBasedRoute requiredRoles={['ADMIN']} fallbackPath="/dashboard">
        <div className="container mx-auto py-8">
          <ContentSkeleton variant="card" />
        </div>
      </RoleBasedRoute>
    )
  }

  if (error || !donor) {
    return (
      <RoleBasedRoute requiredRoles={['ADMIN']} fallbackPath="/dashboard">
        <div className="container mx-auto py-8">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/admin/donors">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Donors
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Donor</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.push('/admin/donors')}>
                Return to Donors List
              </Button>
            </CardContent>
          </Card>
        </div>
      </RoleBasedRoute>
    )
  }

  return (
    <RoleBasedRoute requiredRoles={['ADMIN']} fallbackPath="/dashboard">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/admin/donors">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Donors
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{donor.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getDonorTypeColor(donor.type)}>
                {donor.type}
              </Badge>
              {donor.isActive ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Inactive
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href={`/admin/donors/${donor.id}/edit`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Donor
              </Button>
            </Link>
          </div>
        </div>

        <StatCardGrid columns={4}>
          <StatCard
            label="Commitments"
            value={donor._count.commitments}
            severity="info"
            icon={HandHeart}
          />
          <StatCard
            label="Responses"
            value={donor._count.responses}
            severity="info"
            icon={Package}
          />
          <StatCard
            label="Entity Assignments"
            value={donor._count.entityAssignments}
            severity="info"
            icon={Building2}
          />
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Organization Status</p>
                  <p className="text-sm font-medium">
                    {donor.isActive ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-red-600">Inactive</span>
                    )}
                  </p>
                </div>
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </StatCardGrid>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Organization Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-gray-600">Organization Name</h4>
                <p className="mt-1">{donor.name}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-gray-600">Organization Type</h4>
                <div className="mt-1">
                  <Badge className={getDonorTypeColor(donor.type)}>
                    {donor.type}
                  </Badge>
                </div>
              </div>
              
              {donor.organization && (
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Organization Details</h4>
                  <p className="mt-1">{donor.organization}</p>
                </div>
              )}
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-600">Contact Information</h4>
                
                {donor.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{donor.contactEmail}</span>
                  </div>
                )}
                
                {donor.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{donor.contactPhone}</span>
                  </div>
                )}
                
                {!donor.contactEmail && !donor.contactPhone && (
                  <p className="text-sm text-gray-500">No contact information provided</p>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium text-sm text-gray-600">Registration Date</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{new Date(donor.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Linked User Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {donor.user ? (
                <>
                  <div>
                    <h4 className="font-medium text-sm text-gray-600">Contact Name</h4>
                    <p className="mt-1">{donor.user.name}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-gray-600">Username</h4>
                    <p className="mt-1">{donor.user.username}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-gray-600">User Email</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{donor.user.email}</span>
                    </div>
                  </div>
                  
                  {donor.user.organization && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-600">User Organization</h4>
                      <p className="mt-1">{donor.user.organization}</p>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-600">Account Status</h4>
                    
                    <div className="flex items-center gap-2">
                      {donor.user.isActive ? (
                        <>
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Inactive</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {donor.user.isLocked ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600">Locked</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Unlocked</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-sm text-gray-600">Account Created</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{new Date(donor.user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No linked user account</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleBasedRoute>
  )
}