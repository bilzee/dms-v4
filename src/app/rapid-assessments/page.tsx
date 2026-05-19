'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function RapidAssessmentsPage() {
  const { currentRole, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && currentRole) {
      // Redirect based on user role
      switch (currentRole) {
        case 'ASSESSOR':
          router.replace('/assessor/rapid-assessments')
          break
        case 'COORDINATOR':
          router.replace('/assessor/rapid-assessments')
          break
        case 'RESPONDER':
          router.replace('/assessor/rapid-assessments')
          break
        case 'DONOR':
          router.replace('/donor/rapid-assessments')
          break
        case 'ADMIN':
          router.replace('/assessor/rapid-assessments')
          break
        default:
          router.replace('/dashboard')
      }
    }
  }, [isAuthenticated, currentRole, router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}