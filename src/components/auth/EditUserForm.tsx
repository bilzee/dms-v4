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
import { useAuth } from '@/hooks/useAuth'
import { apiGet, apiPut } from '@/lib/api'

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

interface Role {
  id: string
  name: string
  description?: string
}

interface EditUserFormProps {
  user: User
  isAdmin: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

const adminEditSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, apostrophes, and hyphens'),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s()-]+$/.test(val), 'Please enter a valid phone number'),
  organization: z.string()
    .optional()
    .refine((val) => !val || val.length <= 100, 'Organization name is too long'),
  isActive: z.boolean(),
  roles: z.array(z.string()).min(1, 'Please select at least one role'),
  resetPassword: z.boolean().optional()
})

const userEditSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email is too long'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, apostrophes, and hyphens'),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s()-]+$/.test(val), 'Please enter a valid phone number'),
  organization: z.string()
    .optional()
    .refine((val) => !val || val.length <= 100, 'Organization name is too long'),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional()
}).refine((data) => {
  if (data.newPassword && data.newPassword.length > 0) {
    return data.currentPassword && data.currentPassword.length > 0
  }
  return true
}, {
  message: 'Current password is required when setting a new password',
  path: ['currentPassword']
}).refine((data) => {
  if (data.newPassword && data.newPassword.length > 0) {
    return data.newPassword.length >= 8
  }
  return true
}, {
  message: 'New password must be at least 8 characters',
  path: ['newPassword']
}).refine((data) => {
  if (data.newPassword && data.newPassword.length > 0) {
    // Password must contain at least one uppercase, one lowercase, one number, and one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    return passwordRegex.test(data.newPassword)
  }
  return true
}, {
  message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  path: ['newPassword']
}).refine((data) => {
  if (data.newPassword && data.newPassword.length > 0) {
    return data.newPassword === data.confirmPassword
  }
  return true
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type AdminFormData = z.infer<typeof adminEditSchema>
type UserFormData = z.infer<typeof userEditSchema>

const roleDescriptions: Record<string, string> = {
  'ASSESSOR': 'Conduct field assessments and collect data',
  'COORDINATOR': 'Coordinate response activities and manage resources',
  'RESPONDER': 'Execute response activities and provide aid',
  'DONOR': 'Provide funding and resources for disaster response',
  'ADMIN': 'System administration and user management'
}

export function EditUserForm({ user, isAdmin, onSuccess, onCancel }: EditUserFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { token } = useAuth()

  const schema = isAdmin ? adminEditSchema : userEditSchema
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<AdminFormData | UserFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: user.email,
      username: isAdmin ? user.username : undefined,
      name: user.name,
      phone: user.phone || '',
      organization: user.organization || '',
      ...(isAdmin && {
        isActive: user.isActive,
        roles: user.roles.map(ur => ur.role.id),
        resetPassword: false
      })
    }
  })

  const watchedRoles = isAdmin ? watch('roles' as any) : []
  const watchedResetPassword = isAdmin ? watch('resetPassword' as any) : false

  useEffect(() => {
    if (isAdmin && token) {
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
    }
  }, [isAdmin, token])

  const handleRoleChange = (roleId: string, checked: boolean) => {
    if (!isAdmin) return
    
    const currentRoles = watchedRoles || []
    if (checked) {
      setValue('roles' as any, [...currentRoles, roleId], { shouldDirty: true })
    } else {
      setValue('roles' as any, currentRoles.filter((r: string) => r !== roleId), { shouldDirty: true })
    }
  }

  const onSubmit = async (data: AdminFormData | UserFormData) => {
    try {
      setError(null)
      setSuccess(null)

      let requestBody: any = {
        email: data.email,
        name: data.name,
        phone: data.phone,
        organization: data.organization
      }

      if (isAdmin) {
        const adminData = data as AdminFormData
        requestBody = {
          ...requestBody,
          username: adminData.username,
          isActive: adminData.isActive,
          roleIds: adminData.roles,
          resetPassword: adminData.resetPassword
        }
      } else {
        const userData = data as UserFormData
        if (userData.newPassword) {
          requestBody.currentPassword = userData.currentPassword
          requestBody.newPassword = userData.newPassword
        }
      }

      const endpoint = isAdmin ? `/api/v1/users/${user.id}` : '/api/v1/auth/profile'
      const result = await apiPut(endpoint, requestBody)

      if (!result.success) {
        throw new Error(result.error || 'Update failed')
      }

      setSuccess('User updated successfully!')
      
      // Reset form dirty state to disable button
      reset(undefined, { keepValues: true })
      
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000)
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{isAdmin ? 'Edit User' : 'Edit Profile'}</CardTitle>
        <CardDescription>
          {isAdmin ? 'Update user information and role assignments' : 'Update your profile information'}
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
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription className="font-medium">{success}</AlertDescription>
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

          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="username"
                {...register('username' as any)}
                aria-invalid={(errors as any).username ? 'true' : 'false'}
              />
              {(errors as any).username && (
                <p className="text-sm text-red-600" role="alert">
                  {(errors as any).username.message}
                </p>
              )}
            </div>
          )}

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

          {isAdmin && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={watch('isActive' as any)}
                  onCheckedChange={(checked) => setValue('isActive' as any, !!checked, { shouldDirty: true })}
                />
                <Label htmlFor="isActive">Active User</Label>
              </div>

              <div className="space-y-3">
                <Label>Roles</Label>
                <p className="text-sm text-gray-600">Select the roles for this user:</p>
                {loadingRoles ? (
                  <div className="text-sm text-gray-500">Loading roles...</div>
                ) : (
                  <div className="space-y-2">
                    {availableRoles.map((role) => (
                      <div key={role.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={watchedRoles?.includes(role.id) || false}
                          onCheckedChange={(checked) => handleRoleChange(role.id, !!checked)}
                        />
                        <div className="space-y-1">
                          <Label 
                            htmlFor={`role-${role.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {role.name}
                          </Label>
                          <p className="text-xs text-gray-500">
                            {roleDescriptions[role.name] || 'Role for system operations'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(errors as any).roles && (
                  <p className="text-sm text-red-600" role="alert">
                    {(errors as any).roles.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="resetPassword"
                  checked={watchedResetPassword}
                  onCheckedChange={(checked) => setValue('resetPassword' as any, !!checked, { shouldDirty: true })}
                />
                <Label htmlFor="resetPassword">Reset user password to default</Label>
              </div>
            </>
          )}

          {!isAdmin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password (for password change)</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  {...register('currentPassword' as any)}
                />
                {(errors as any).currentPassword && (
                  <p className="text-sm text-red-600" role="alert">
                    {(errors as any).currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password (leave blank to keep current)</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password (min 8 characters)"
                  {...register('newPassword' as any)}
                />
                {(errors as any).newPassword && (
                  <p className="text-sm text-red-600" role="alert">
                    {(errors as any).newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  {...register('confirmPassword' as any)}
                />
                {(errors as any).confirmPassword && (
                  <p className="text-sm text-red-600" role="alert">
                    {(errors as any).confirmPassword.message}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? 'Updating...' : 'Update User'}
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}