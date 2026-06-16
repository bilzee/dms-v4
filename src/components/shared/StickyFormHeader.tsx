'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Info, X } from '@/lib/icons'
import { cn } from '@/lib/utils'

interface StickyFormHeaderProps {
  icon: React.ReactNode
  title: string
  description: string
  gapCount: number
  gapLabels?: string[]
  hasInteracted: boolean
  extraBadges?: React.ReactNode
  children?: React.ReactNode
  isReassessment?: boolean
  previousAssessmentDate?: string
}

export function StickyFormHeader({
  icon,
  title,
  description,
  gapCount,
  gapLabels,
  hasInteracted,
  extraBadges,
  isReassessment,
  previousAssessmentDate,
}: StickyFormHeaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const checkStuck = useCallback(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    setIsStuck(sentinel.getBoundingClientRect().top < 0)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', checkStuck, { passive: true })
    checkStuck()
    return () => window.removeEventListener('scroll', checkStuck)
  }, [checkStuck])

  const showBanner = isReassessment && !bannerDismissed

  return (
    <>
      <div ref={sentinelRef} className="h-0" />
      <div
        className={cn(
          isStuck && 'sticky top-[104px] md:top-0 z-30'
        )}
      >
        {showBanner && (
          <div className={cn(
            'flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 p-3 text-sm',
            isStuck && 'rounded-b-none border-b-0'
          )}>
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-blue-800 dark:text-blue-200">Reassessment — Previous Data Loaded</p>
              {!isStuck && (
                <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                  This form is pre-populated with data from the previous assessment{previousAssessmentDate ? ` on ${previousAssessmentDate}` : ''}. Gaps and risks reflect earlier findings. Update fields as needed.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 flex-shrink-0 mt-0.5"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <Card
          className={cn(
            'transition-shadow duration-200',
            isStuck && 'rounded-t-none border-t-0 border-b-2 border-b-primary/30 shadow-md'
          )}
        >
          <CardHeader className={cn(isStuck && 'py-3')}>
            <div className="flex items-center gap-3">
              <CardTitle className={cn('flex items-center gap-2', isStuck && 'text-lg')}>
                {icon}
                <span className={cn(isStuck && 'truncate max-w-[200px] sm:max-w-none')}>{title}</span>
                {hasInteracted && gapCount > 0 && (
                  <Badge variant="destructive">
                    {gapCount} Gap{gapCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {extraBadges}
              </CardTitle>
            </div>
            {!isStuck && <CardDescription className="hidden sm:block">{description}</CardDescription>}
          </CardHeader>
          {!isStuck && hasInteracted && gapCount > 0 && gapLabels && gapLabels.length > 0 && (
            <CardContent>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Gaps Identified:</strong> {gapLabels.join(', ')}
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>
      </div>
    </>
  )
}
