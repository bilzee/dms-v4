'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EditUserForm } from '@/components/auth/EditUserForm'
import { useAuth } from '@/hooks/useAuth'

interface User {
  id: string
  email: string
  username: string
  name: string
  phone?: string
  organization?: string
  isActive: boolean
  roles: Array<{
    role: {
      id: string
      name: string
    }
  }>
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { token, user: authUser } = useAuth()

  useEffect(() => {
    if (token && authUser) {
      // Use the user from auth context
      setUser(authUser as User)
      setLoading(false)
    }
  }, [token, authUser])

  const handleUpdateSuccess = () => {
    // The auth context should automatically update
    // You might want to refresh the user data here
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Unable to load profile information. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-gray-600 hidden sm:block">Manage your personal information and account settings</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Role Information</CardTitle>
            <CardDescription>
              Your current roles and permissions in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Roles:</strong> {user.roles?.map(r => r.role.name).join(', ') || 'No roles assigned'}
              </div>
              <div>
                <strong>Username:</strong> {user.username}
              </div>
              <div>
                <strong>Account Status:</strong> {user.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </CardContent>
        </Card>

        <EditUserForm 
          user={user}
          isAdmin={false}
          onSuccess={handleUpdateSuccess}
        />
      </div>
    </div>
  )
}