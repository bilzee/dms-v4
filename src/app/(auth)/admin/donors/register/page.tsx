'use client'

import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { DonorRegistrationForm } from '@/components/donor/DonorRegistrationForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield, Users, Building2 } from '@/lib/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminDonorRegistrationPage() {
  const router = useRouter()

  const handleRegistrationSuccess = (data: any) => {
    // For admin registration, redirect to the admin donor management page
    router.push('/admin/donors')
  }

  const handleCancel = () => {
    router.push('/admin/donors')
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
                  Back to Donor Management
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Register New Donor</h1>
            <p className="text-muted-foreground hidden sm:block">
              Create a new donor organization and associated user account
            </p>
          </div>
        </div>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Registration Process
            </CardTitle>
            <CardDescription>
              This form creates both a donor organization and user account simultaneously. 
              Only administrators can perform this registration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium">Donor Organization</h4>
                  <p className="text-sm text-muted-foreground">
                    Creates the organization record with contact details and type classification
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium">User Account</h4>
                  <p className="text-sm text-muted-foreground">
                    Creates linked user account with DONOR role and login credentials
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <DonorRegistrationForm 
          onSuccess={handleRegistrationSuccess}
          onCancel={handleCancel}
        />
      </div>
    </RoleBasedRoute>
  )
}