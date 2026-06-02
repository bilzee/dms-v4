'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from '@/lib/icons'
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
}

export function StickyFormHeader({
  icon,
  title,
  description,
  gapCount,
  gapLabels,
  hasInteracted,
  extraBadges,
}: StickyFormHeaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinelRef} className="h-0" />
      <Card
        className={cn(
          'transition-all duration-200',
          isStuck && 'sticky top-0 z-30 rounded-b-none border-b-2 border-b-primary/30 shadow-md'
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
          {!isStuck && <CardDescription>{description}</CardDescription>}
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
    </>
  )
}
