import Link from 'next/link'

export default function AuthNotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Page not found</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">The page you are looking for does not exist.</p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  )
}
