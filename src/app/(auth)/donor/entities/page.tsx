'use client'

import { useAuth } from '@/hooks/useAuth'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { EntitySelector } from '@/components/donor/EntitySelector'
import { Badge } from '@/components/ui/badge'

export default function DonorEntitiesPage() {
  const { currentRole, user } = useAuth()

  return (
    <RoleBasedRoute requiredRole="DONOR">
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Assigned Entities</h1>
              <p className="text-gray-600 mt-2 hidden sm:block">
                View and manage entities assigned to your organization
              </p>
            </div>
          </div>
        </div>

        {/* Entities Content */}
        <EntitySelector />
      </div>
    </RoleBasedRoute>
  )
}