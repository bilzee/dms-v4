'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'

// UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormCard } from '@/components/shared/FormCard'
import { FormActionBar } from '@/components/shared/FormActionBar'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Icons
import { User, Building, Mail, Phone, Edit2, Save, X, Upload, CheckCircle, AlertCircle, Package, TrendingUp } from '@/lib/icons'

// Types
import { DonorProfileUpdateInput } from '@/lib/validation/donor'
import { useAuth } from '@/hooks/useAuth'
import { apiGet, apiPatch } from '@/lib/api'
import { ContentSkeleton } from '@/components/shared/ContentSkeleton'

// Validation schema
const DonorProfileFormSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  contactEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  contactPhone: z.string().min(10, 'Phone number must be at least 10 digits').optional().or(z.literal('')),
  organization: z.string().min(2, 'Organization name must be at least 2 characters').optional().or(z.literal(''))
})

type DonorProfileFormData = z.infer<typeof DonorProfileFormSchema>

interface DonorProfileProps {
  donorId?: string
}

export function DonorProfile({ donorId }: DonorProfileProps) {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<DonorProfileFormData>({
    resolver: zodResolver(DonorProfileFormSchema),
    defaultValues: {
      name: '',
      contactEmail: '',
      contactPhone: '',
      organization: ''
    }
  })

  // Fetch donor profile
  const { data: donorData, isLoading, error } = useQuery({
    queryKey: ['donor-profile'],
    queryFn: async () => {
      const result = await apiGet('/api/v1/donors/profile')
      if (!result.success) throw new Error(result.error || 'Failed to fetch donor profile')
      return result.data
    },
    enabled: !!user
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: DonorProfileUpdateInput) => {
      const result = await apiPatch('/api/v1/donors/profile', data)
      if (!result.success) throw new Error(result.error || 'Failed to update profile')
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-profile'] })
      setIsEditing(false)
      toast.success('Profile updated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile')
    }
  })

  // Set form values when data is loaded
  useEffect(() => {
    if (donorData?.donor) {
      form.reset({
        name: donorData.donor.name || '',
        contactEmail: donorData.donor.contactEmail || '',
        contactPhone: donorData.donor.contactPhone || '',
        organization: donorData.donor.organization || ''
      })
    }
  }, [donorData, form])

  const onSubmit = (data: DonorProfileFormData) => {
    // Filter out empty strings from optional fields
    const cleanedData: DonorProfileUpdateInput = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== '')
    )
    
    updateProfileMutation.mutate(cleanedData)
  }

  const handleCancel = () => {
    form.reset()
    setIsEditing(false)
  }

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    if (!donorData?.donor) return 0
    
    const placeholderPatterns = ['+234-800', 'N/A', 'undefined', 'null']
    const isValid = (value: unknown) => {
      if (!value || typeof value !== 'string') return false
      if (value.trim() === '') return false
      return !placeholderPatterns.some(p => value.includes(p))
    }
    
    const requiredFields = ['name']
    const optionalFields = ['contactEmail', 'contactPhone', 'organization']
    
    const completedRequired = requiredFields.filter(field => isValid(donorData.donor[field])).length
    const completedOptional = optionalFields.filter(field => isValid(donorData.donor[field])).length
    
    const requiredWeight = 0.6
    const optionalWeight = 0.4
    
    const requiredScore = (completedRequired / requiredFields.length) * requiredWeight * 100
    const optionalScore = (completedOptional / optionalFields.length) * optionalWeight * 100
    
    return Math.round(requiredScore + optionalScore)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <ContentSkeleton variant="card" />
            </CardHeader>
            <CardContent>
              <ContentSkeleton variant="form" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load donor profile. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  const donor = donorData?.donor
  const profileCompletion = calculateProfileCompletion()

  return (
    <div className="space-y-6" data-testid="donor-profile-container">
      {/* Profile Overview */}
      <div className="flex items-center justify-between" data-testid="profile-overview">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16" data-testid="profile-avatar">
            <AvatarImage src="" />
            <AvatarFallback className="text-lg">
              {donor?.name?.charAt(0) || 'D'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold" data-testid="profile-name">{donor?.name}</h2>
            <p className="text-gray-600 hidden sm:block" data-testid="profile-type">{donor?.type}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2" data-testid="profile-completion-section">
          <div className="text-right mr-4">
            <p className="text-sm text-gray-600" data-testid="profile-completion-text">Profile Completion</p>
            <p className="text-lg font-semibold" data-testid="profile-completion-percentage">{profileCompletion}%</p>
          </div>
          <Progress value={profileCompletion} className="w-24" data-testid="profile-completion-bar" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Building className="mr-2 h-5 w-5" />
                    Organization Information
                  </CardTitle>
                  <CardDescription>
                    Manage your organization&apos;s profile information
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <FormActionBar
                    onCancel={handleCancel}
                    submitLabel="Save"
                    onSubmit={form.handleSubmit(onSubmit)}
                    loading={updateProfileMutation.isPending}
                    disabled={updateProfileMutation.isPending}
                    variant="default"
                    className="pt-0"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <FormCard variant="compact" columns={2}>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter organization name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="organization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Details</FormLabel>
                          <FormControl>
                            <Input placeholder="Additional organization information" {...field} />
                          </FormControl>
                          <FormDescription>
                            Additional details about your organization (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="contact@organization.com" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="+1234567890" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
                </FormCard>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Organization Name</label>
                      <p className="text-lg">{donor?.name || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Type</label>
                      <p className="text-lg">{donor?.type || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Contact Email</label>
                      <p className="text-lg flex items-center">
                        {donor?.contactEmail ? (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            {donor.contactEmail}
                          </>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Contact Phone</label>
                      <p className="text-lg flex items-center">
                        {donor?.contactPhone ? (
                          <>
                            <Phone className="h-4 w-4 mr-2" />
                            {donor.contactPhone}
                          </>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {donor?.organization && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Organization Details</label>
                      <p className="text-lg">{donor.organization}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Commitments</span>
                  <Badge variant="secondary">
                    {donor?.metrics?.commitments?.total || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Delivery Rate</span>
                  <Badge variant="secondary">
                    {donor?.metrics?.commitments?.deliveryRate || 0}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Responses</span>
                  <Badge variant="secondary">
                    {donor?.metrics?.responses?.total || 0}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Activities</span>
                  <Badge variant="default">
                    {donor?.metrics?.combined?.totalActivities || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  <StatusBadge status={donor?.isActive ? 'ONLINE' : 'OFFLINE'} domain="system" label={donor?.isActive ? 'Active' : 'Inactive'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Member Since</span>
                  <span className="text-sm">
                    {donor?.createdAt ? new Date(donor.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}