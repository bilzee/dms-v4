import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            Disaster Management System
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Field assessment and response coordination for Nigeria
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