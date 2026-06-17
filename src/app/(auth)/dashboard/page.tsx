'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_DASHBOARD_PATHS } from '@/lib/auth/route-config'
import type { RoleName } from '@prisma/client'

export default function DashboardPage() {
  const router = useRouter()
  const { currentRole, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    const target = currentRole && ROLE_DASHBOARD_PATHS[currentRole as RoleName]
      ? ROLE_DASHBOARD_PATHS[currentRole as RoleName]
      : '/login'
    router.replace(target)
  }, [isAuthenticated, currentRole, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  )
}
