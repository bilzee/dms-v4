'use client'

import { useState, useEffect } from 'react'
import { useAdminDonorDetail, useUpdateDonor } from '@/hooks/useAdminDonorDetail'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormCard } from '@/components/shared/FormCard'
import { FormActionBar } from '@/components/shared/FormActionBar'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Building2,
  User,
  ArrowLeft,
  AlertCircle
} from 'lucide-react'
import { ContentSkeleton } from '@/components/shared/ContentSkeleton'

// Form validation schema
const EditDonorFormSchema = z.object({
  // Organization fields
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  organization: z.string().optional(),
  contactEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  isActive: z.boolean(),
  // User fields
  userCredentials: z.object({
    name: z.string().min(2, 'Contact name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    username: z.string().min(3, 'Username must be at least 3 characters')
  })
})

type EditDonorFormData = z.infer<typeof EditDonorFormSchema>

interface DonorDetails {
  id: string
  name: string
  type: string
  contactEmail?: string
  contactPhone?: string
  organization?: string
  isActive: boolean
  user: {
    id: string
    username: string
    email: string
    name: string
    organization?: string
  }
}

export default function EditDonorPage() {
  const params = useParams()
  const router = useRouter()
  const donorId = params.id as string
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: donor, isLoading: loading } = useAdminDonorDetail(donorId)
  const updateDonorMutation = useUpdateDonor(donorId)

  const form = useForm<EditDonorFormData>({
    resolver: zodResolver(EditDonorFormSchema),
    defaultValues: {
      name: '',
      organization: '',
      contactEmail: '',
      contactPhone: '',
      isActive: true,
      userCredentials: {
        name: '',
        email: '',
        username: ''
      }
    }
  })

  useEffect(() => {
    if (donor) {
      form.reset({
        name: donor.name || '',
        organization: donor.organization || '',
        contactEmail: donor.contactEmail || '',
        contactPhone: donor.contactPhone || '',
        isActive: donor.isActive,
        userCredentials: {
          name: donor.user?.name || '',
          email: donor.user?.email || '',
          username: donor.user?.username || ''
        }
      })
    }
  }, [donor, form])

  const onSubmit = async (data: EditDonorFormData) => {
    try {
      setSaving(true)
      setError(null)

      const updateData = {
        name: data.name,
        organization: data.organization || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        isActive: data.isActive,
        userCredentials: data.userCredentials
      }

      try {
        await updateDonorMutation.mutateAsync(updateData)
        toast.success('Donor updated successfully!')
        router.push(`/admin/donors/${donorId}`)
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to update donor'
        if (err?.message?.includes('conflict') || err?.message?.includes('409')) {
          const conflictMsg = 'An organization with this name or contact email already exists.'
          setError(conflictMsg)
          toast.error(conflictMsg)
        } else {
          setError(errorMsg)
          toast.error(errorMsg)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <RoleBasedRoute requiredRoles={['ADMIN']} fallbackPath="/dashboard">
        <div className="container mx-auto py-8">
          <ContentSkeleton variant="form" />
        </div>
      </RoleBasedRoute>
    )
  }

  if (error && !donor) {
    return (
      <RoleBasedRoute requiredRoles={['ADMIN']} fallbackPath="/dashboard">
        <div className="container mx-auto py-8">
          <div className="flex items-center gap-2 mb-6">
            <Link href="/admin/donors">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Donors
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Donor</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.push('/admin/donors')}>
                Return to Donors List
              </Button>
            </CardContent>
          </Card>
        </div>
      </RoleBasedRoute>
    )
  }

  return (
    <RoleBasedRoute requiredRoles={['ADMIN']} fallbackPath="/dashboard">
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href={`/admin/donors/${donorId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Donor Details
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Donor: {donor?.name}</h1>
            <p className="text-muted-foreground">
              Update organization and user account information
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormCard columns={2}>
              {/* Organization Information */}
              <FormCard.Section title="Organization Information" description="Update organization details and contact information">
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
                          Additional details about the organization (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Active Organization
                          </FormLabel>
                          <FormDescription>
                            Enable or disable this organization&apos;s access to the platform
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
              </FormCard.Section>

              {/* User Account Information */}
              <FormCard.Section title="Linked User Account" description="Update the linked user account details">
                  <FormField
                    control={form.control}
                    name="userCredentials.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name of primary contact" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="userCredentials.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Email *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="user@organization.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          This email will be used for login notifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="userCredentials.username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username *</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Note: The user&apos;s password cannot be changed through this form. 
                      Password changes must be done through the user&apos;s profile settings.
                    </AlertDescription>
                  </Alert>
              </FormCard.Section>
            </FormCard>

            {/* Action Buttons */}
            <FormActionBar
              onCancel={() => router.push(`/admin/donors/${donorId}`)}
              submitLabel="Save Changes"
              loading={saving}
              disabled={saving}
              variant="bordered"
            />
          </form>
        </Form>
      </div>
    </RoleBasedRoute>
  )
}