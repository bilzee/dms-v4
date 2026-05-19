'use client'

import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { ReportManagement } from '@/components/reports/ReportManagement'

export default function CoordinatorReportsPage() {
  return (
    <RoleBasedRoute requiredRole="COORDINATOR">
      <div className="container mx-auto py-8">
        <ReportManagement />
      </div>
    </RoleBasedRoute>
  )
}
