'use client'

import { useAuth } from '@/hooks/useAuth'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { DonorProfile } from '@/components/donor/DonorProfile'
import { Badge } from '@/components/ui/badge'

export default function DonorProfilePage() {
  const { currentRole, user } = useAuth()

  return (
    <RoleBasedRoute requiredRole="DONOR">
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Donor Profile</h1>
              <p className="text-gray-600 mt-2 hidden sm:block">
                Manage your organization profile and settings
              </p>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <DonorProfile />
      </div>
    </RoleBasedRoute>
  )
}