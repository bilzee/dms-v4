'use client'

import { LoginForm } from '@/components/auth/LoginForm'
import { useBranding } from '@/hooks/useBranding'

export default function LoginPage() {
  const { appName, appDescription, loginLogoUrl } = useBranding()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {loginLogoUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={loginLogoUrl}
              alt={`${appName} logo`}
              className="w-64 h-64 object-contain"
            />
          </div>
        )}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            {appName}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {appDescription}
          </p>
        </div>
        <LoginForm />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Contact your administrator for account access
          </p>
        </div>
      </div>
    </div>
  )
}
