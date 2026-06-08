'use client'

import { useBranding } from '@/hooks/useBranding'

export function BrandedFooter() {
  const { appName } = useBranding()

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-center text-sm text-muted-foreground">
          {appName} &mdash; Disaster Response Management System
        </p>
      </div>
    </footer>
  )
}
