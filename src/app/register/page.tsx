'use client'

import { DonorRegistrationForm } from '@/components/donor/DonorRegistrationForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Building } from '@/lib/icons'

export default function DonorRegistrationPage() {
  const handleRegistrationSuccess = (data: any) => {
    // Redirect will be handled by the form component
    console.log('Registration successful:', data)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/login">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </Link>
          
          <div className="text-center">
            <Building className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="registration-form-title">
              Register Your Organization
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join our disaster response platform and start making a difference in communities affected by disasters. 
              Register your organization to access resources and coordinate relief efforts.
            </p>
          </div>
        </div>

        {/* Registration Form */}
        <DonorRegistrationForm 
          onSuccess={handleRegistrationSuccess}
        />

        {/* Additional Information */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Why Register?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Access real-time disaster assessment data</li>
                <li>• Coordinate with response teams</li>
                <li>• Track your contribution impact</li>
                <li>• Join a network of verified donors</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organization Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• NGOs and Non-profits</li>
                <li>• Corporate Organizations</li>
                <li>• Government Agencies</li>
                <li>• Individual Donors</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Get Started</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Complete the registration form to create your organization account and start contributing to disaster response efforts.
              </p>
              <div className="text-sm text-muted-foreground">
                Questions? Contact our support team for assistance.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}