'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface SectionProgressProps {
  containerRef: React.RefObject<HTMLElement>
  sections: Array<{ id: string; label: string }>
  className?: string
}

export function SectionProgress({ containerRef, sections, className }: SectionProgressProps) {
  const [activeId, setActiveId] = useState<string>('')
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const cards = sections
      .map(s => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[]

    if (cards.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length > 0) {
          const id = visible[0].target.id
          setActiveId(id)
          setCompletedIds(prev => {
            const next = new Set(prev)
            const idx = sections.findIndex(s => s.id === id)
            for (let i = 0; i < idx; i++) {
              next.add(sections[i].id)
            }
            return next
          })
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    )

    cards.forEach(card => observerRef.current?.observe(card))

    return () => observerRef.current?.disconnect()
  }, [containerRef, sections])

  const progress = sections.length > 0
    ? Math.round((completedIds.size / sections.length) * 100)
    : 0

  return (
    <div className={cn('sticky top-16 z-20 md:hidden', className)}>
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto">
          {sections.map((section, index) => {
            const isActive = activeId === section.id
            const isCompleted = completedIds.has(section.id)

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  isActive && 'bg-primary text-primary-foreground',
                  !isActive && isCompleted && 'bg-primary/15 text-primary',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                )}
                aria-label={`Section ${index + 1}: ${section.label}`}
              >
                {isCompleted && !isActive ? '✓' : index + 1}
              </button>
            )
          })}
          <span className="ml-auto flex-shrink-0 text-xs font-medium text-muted-foreground">
            {progress}%
          </span>
        </div>
        <div className="h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
