'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { apiGet, apiPost } from '@/lib/api'

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  organization: z.string().optional(),
  roles: z.array(z.string()).min(1, 'Please select at least one role')
})

type RegisterFormData = z.infer<typeof registerSchema>

interface RegisterFormProps {
  onSuccess?: () => void
}

interface Role {
  id: string
  name: string
  description?: string
}

const roleDescriptions: Record<string, string> = {
  'ASSESSOR': 'Conduct field assessments and collect data',
  'COORDINATOR': 'Coordinate response activities and manage resources',
  'RESPONDER': 'Execute response activities and provide aid',
  'DONOR': 'Provide funding and resources for disaster response',
  'ADMIN': 'System administration and user management'
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      roles: []
    }
  })

  const watchedRoles = watch('roles')

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true)
        const result = await apiGet('/api/v1/roles')

        if (result.success) {
          setAvailableRoles((result.data as any)?.data?.roles || result.data?.roles || [])
        } else {
          console.error('Failed to fetch roles:', result.error)
        }
      } catch (err) {
        console.error('Error fetching roles:', err)
      } finally {
        setLoadingRoles(false)
      }
    }

    fetchRoles()
  }, [])

  const handleRoleChange = (roleId: string, checked: boolean) => {
    const currentRoles = watchedRoles || []
    if (checked) {
      setValue('roles', [...currentRoles, roleId])
    } else {
      setValue('roles', currentRoles.filter(r => r !== roleId))
    }
  }

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null)
      setSuccess(null)

      // Admin creating user - use user management endpoint with role assignment
      const roleIds = data.roles || []
      const requestData = { ...data, roleIds }

      const result = await apiPost('/api/v1/users', requestData)

      if (!result.success) {
        throw new Error(result.error || 'User creation failed')
      }

      setSuccess('User created successfully!')
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'User creation failed')
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create User</CardTitle>
        <CardDescription>
          Create a new user account with role assignments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              {...register('email')}
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && (
              <p className="text-sm text-red-600" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="username"
              {...register('username')}
              aria-invalid={errors.username ? 'true' : 'false'}
            />
            {errors.username && (
              <p className="text-sm text-red-600" role="alert">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password (min 8 characters)"
              {...register('password')}
              aria-invalid={errors.password ? 'true' : 'false'}
            />
            {errors.password && (
              <p className="text-sm text-red-600" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
            />
            {errors.name && (
              <p className="text-sm text-red-600" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+234 xxx xxx xxxx"
              {...register('phone')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Organization (Optional)</Label>
            <Input
              id="organization"
              type="text"
              placeholder="NEMA, Red Cross, etc."
              {...register('organization')}
            />
          </div>

          <div className="space-y-3">
            <Label>Roles</Label>
            <p className="text-sm text-gray-600">Select the roles for this user:</p>
            {loadingRoles ? (
              <div className="text-sm text-gray-500">Loading roles...</div>
            ) : availableRoles.length === 0 ? (
              <div className="text-sm text-amber-600">
                Unable to load roles. Please check console for details or contact system administrator.
              </div>
            ) : (
              <div className="space-y-2">
                {availableRoles.map((role) => {
                  const isDonorRole = role.name === 'DONOR'
                  return (
                    <div key={role.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`role-${role.id}`}
                        value={role.id}
                        checked={watchedRoles?.includes(role.id) || false}
                        onCheckedChange={(checked) => handleRoleChange(role.id, !!checked)}
                        disabled={isDonorRole}
                      />
                      <div className="space-y-1">
                        <Label 
                          htmlFor={`role-${role.id}`}
                          className={`text-sm font-medium leading-none ${isDonorRole ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {role.name}
                        </Label>
                        <p className={`text-xs ${isDonorRole ? 'text-amber-600' : 'text-gray-500'}`}>
                          {isDonorRole ? 
                            'DONOR users can only be created via the Donor Registration Form (together with a Donor Organization). Use "Register New Donor" to create donor users.' : 
                            (roleDescriptions[role.name] || 'Role for system operations')
                          }
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {errors.roles && (
              <p className="text-sm text-red-600" role="alert">
                {errors.roles.message}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create User'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}