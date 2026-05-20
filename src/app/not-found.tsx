import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100">404</h2>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Page not found</p>
        <p className="mt-1 text-sm text-gray-500">The page you are looking for does not exist or has been moved.</p>
      </div>
      <Link
        href="/"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  )
}
