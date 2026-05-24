'use client'

import React from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// UI components
import { Button } from '@/components/ui/button'

import { FormCard } from '@/components/shared/FormCard'
import { FormActionBar } from '@/components/shared/FormActionBar'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

// Icons
import { Building, User, Mail, Phone, Shield, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

// API utilities
import { apiPost } from '@/lib/api'
import { setAuthToken } from '@/lib/auth/token-utils'

// Types and validation
import { DonorRegistrationInput } from '@/lib/validation/donor'

// Extend validation for form use
const DonorRegistrationFormSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  type: z.enum(['ORGANIZATION', 'INDIVIDUAL', 'GOVERNMENT', 'NGO', 'CORPORATE'], {
    errorMap: () => ({ message: 'Please select a valid donor type' })
  }),
  contactEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  contactPhone: z.string().min(10, 'Phone number must be at least 10 digits').optional().or(z.literal('')),
  organization: z.string().min(2, 'Organization details must be at least 2 characters').optional().or(z.literal('')),
  userCredentials: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Contact name must be at least 2 characters')
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  })
})

type DonorRegistrationFormData = z.infer<typeof DonorRegistrationFormSchema>

interface DonorRegistrationFormProps {
  onSuccess?: (data: any) => void
  onCancel?: () => void
}

export function DonorRegistrationForm({ onSuccess, onCancel }: DonorRegistrationFormProps) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const totalSteps = 2

  const form = useForm<DonorRegistrationFormData>({
    resolver: zodResolver(DonorRegistrationFormSchema),
    defaultValues: {
      name: '',
      type: 'ORGANIZATION',
      contactEmail: '',
      contactPhone: '',
      organization: '',
      userCredentials: {
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        name: ''
      }
    }
  })

  const registrationMutation = useMutation({
    mutationFn: async (data: DonorRegistrationInput) => {
      const result = await apiPost('/api/v1/donors', data)
      
      if (!result.success) {
        throw {
          status: 400,
          message: result.error || 'Registration failed',
          details: null
        }
      }
      
      return result
    },
    onSuccess: (data) => {
      // Clear any previous errors
      setErrorMessage(null)
      
      // Store auth token
      setAuthToken(data.data.token)
      localStorage.setItem('user_data', JSON.stringify(data.data.user))
      
      toast.success('Registration successful! Welcome to the platform.')
      
      if (onSuccess) {
        onSuccess(data.data)
      } else {
        // Show success message and redirect to donor dashboard
        setTimeout(() => {
          router.push('/donor/dashboard')
        }, 2000)
      }
    },
    onError: (error: any) => {
      let errorMsg = 'Registration failed. Please try again.'
      
      if (error.status === 409) {
        // Conflict error - organization or user already exists
        if (error.message.toLowerCase().includes('organization')) {
          errorMsg = 'An organization with this name or email already exists. Please choose a different name or contact email.'
        } else if (error.message.toLowerCase().includes('user')) {
          errorMsg = 'A user with this email or username already exists. Please choose a different email or username.'
        } else {
          errorMsg = 'The organization name, email, or username you provided is already in use. Please check your entries and try again.'
        }
      } else if (error.status === 400) {
        errorMsg = 'Please check your information and ensure all required fields are filled correctly.'
      } else if (error.status === 500) {
        errorMsg = 'We encountered a server error. Please try again in a moment.'
      } else {
        errorMsg = error.message || errorMsg
      }
      
      setErrorMessage(errorMsg)
      toast.error(errorMsg)
    }
  })

  const watchPassword = form.watch('userCredentials.password')
  const watchConfirmPassword = form.watch('userCredentials.confirmPassword')
  const watchOrganizationName = form.watch('name')
  
  // Calculate form completion for current step
  const getStepCompletion = () => {
    if (currentStep === 1) {
      const fields = ['name', 'type', 'contactEmail', 'contactPhone', 'organization']
      const completed = fields.filter(field => {
        const value = form.getValues(field as keyof DonorRegistrationFormData)
        return value && typeof value === 'string' && value.trim() !== ''
      }).length
      return (completed / fields.length) * 100
    } else {
      const fields = ['username', 'password', 'confirmPassword', 'email', 'name']
      const completed = fields.filter(field => {
        const value = form.getValues(`userCredentials.${field}` as any)
        return value && typeof value === 'string' && value.trim() !== ''
      }).length
      return (completed / fields.length) * 100
    }
  }

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      const fields = ['name', 'type']
      const isValid = fields.every(field => {
        const value = form.getValues(field as keyof DonorRegistrationFormData)
        return value && typeof value === 'string' && value.trim() !== ''
      })
      
      if (!isValid) {
        toast.error('Please fill in all required fields')
        return false
      }
    } else {
      const userCredentials = form.getValues('userCredentials')
      if (!userCredentials.username || !userCredentials.password || 
          !userCredentials.email || !userCredentials.name) {
        toast.error('Please fill in all required fields')
        return false
      }
      
      if (userCredentials.password !== userCredentials.confirmPassword) {
        toast.error('Passwords do not match')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1)
      } else {
        handleSubmit()
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    // Clear any previous error messages
    setErrorMessage(null)
    
    const formData = form.getValues()
    
    // Remove confirmPassword field
    const { confirmPassword, ...userCredentials } = formData.userCredentials
    
    // Filter out empty optional fields
    const registrationData: DonorRegistrationInput = {
      name: formData.name,
      type: formData.type,
      ...(formData.contactEmail && { contactEmail: formData.contactEmail }),
      ...(formData.contactPhone && { contactPhone: formData.contactPhone }),
      ...(formData.organization && { organization: formData.organization }),
      userCredentials
    }
    
    registrationMutation.mutate(registrationData)
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return 0
    let strength = 0
    
    if (password.length >= 8) strength += 25
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25
    if (/\d/.test(password)) strength += 25
    if (/[^a-zA-Z0-9]/.test(password)) strength += 25
    
    return strength
  }

  const passwordStrength = getPasswordStrength(watchPassword || '')
  const passwordStrengthColor = passwordStrength < 50 ? 'bg-red-500' : passwordStrength < 75 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="space-y-2" data-testid="registration-progress-indicator">
        <div className="flex justify-between text-sm">
          <span data-testid="registration-step-text">Step {currentStep} of {totalSteps}</span>
          <span data-testid="registration-completion-text">{Math.round(getStepCompletion())}% complete</span>
        </div>
        <Progress value={(currentStep / totalSteps) * 100} className="h-2" data-testid="registration-progress-bar" />
      </div>

      <FormCard
        title="Donor Registration"
        description="Register your organization to start contributing to disaster response efforts"
        data-testid="donor-registration-card"
      >
          {/* Error Alert */}
          {errorMessage && (
            <Alert variant="destructive" className="mb-6" data-testid="registration-error-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <div className="space-y-6">
              {/* Step 1: Organization Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4" data-testid="organization-info-title">Organization Information</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name *</FormLabel>
                            <FormControl>
                              <Input 
                                data-testid="donor-name-input"
                                placeholder="Enter organization name" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="donor-type-select">
                                  <SelectValue placeholder="Select organization type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ORGANIZATION">Organization</SelectItem>
                                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                                <SelectItem value="GOVERNMENT">Government</SelectItem>
                                <SelectItem value="NGO">NGO</SelectItem>
                                <SelectItem value="CORPORATE">Corporate</SelectItem>
                              </SelectContent>
                            </Select>
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
                              <Input 
                                data-testid="donor-organization-details-input"
                                placeholder="Additional organization information" 
                                {...field} 
                              />
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
                                  data-testid="donor-contact-email-input"
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
                                  data-testid="donor-contact-phone-input"
                                  placeholder="+1234567890" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: User Account */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">User Account</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Create the primary user account for your organization. This account will have administrative access.
                    </p>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="userCredentials.name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Full name of primary contact" 
                                {...field} 
                              />
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
                              <Input 
                                placeholder="Choose a username" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="userCredentials.password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showPassword ? "text" : "password"} 
                                  placeholder="Create a strong password" 
                                  {...field} 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Password must be at least 8 characters
                            </FormDescription>
                            {watchPassword && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Password strength</span>
                                  <span>{passwordStrength}%</span>
                                </div>
                                <Progress value={passwordStrength} className="h-1">
                                  <div className={`h-full ${passwordStrengthColor} transition-all duration-300`} />
                                </Progress>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="userCredentials.confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showConfirmPassword ? "text" : "password"} 
                                  placeholder="Confirm your password" 
                                  {...field} 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            {watchConfirmPassword && watchPassword && (
                              <div className="mt-1">
                                {watchPassword === watchConfirmPassword ? (
                                  <p className="text-xs text-green-600 flex items-center">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Passwords match
                                  </p>
                                ) : (
                                  <p className="text-xs text-red-600 flex items-center">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Passwords do not match
                                  </p>
                                )}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <FormActionBar
                onCancel={onCancel}
                cancelLabel="Cancel"
                submitLabel={registrationMutation.isPending ? 'Registering...' : currentStep === totalSteps ? 'Complete Registration' : 'Next'}
                onSubmit={handleNext}
                loading={registrationMutation.isPending}
                disabled={registrationMutation.isPending}
                align="between"
                variant="default"
                data-testid="registration-navigation"
              >
                {currentStep > 1 && (
                  <Button
                    data-testid="registration-previous-button"
                    type="button" 
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={registrationMutation.isPending}
                  >
                    Previous
                  </Button>
                )}
              </FormActionBar>
            </div>
          </Form>
      </FormCard>

      {/* Registration Info */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          By registering, you agree to our terms of service and privacy policy. 
          Your organization information will be used to coordinate disaster response efforts.
        </AlertDescription>
      </Alert>
    </div>
  )
}